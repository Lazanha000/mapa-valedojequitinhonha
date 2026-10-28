#!/usr/bin/env python3
"""Baixa a malha oficial do IBGE (Mesorregião Jequitinhonha, municípios, qualidade máxima)
e grava dados.json (mapa) e indicadores.json (população, área, densidade, PIB) ao lado do index.html. Rode uma vez, com internet:  python3 gerar_dados_offline.py
Depois, publique a pasta com o dados.json: o site deixa de depender do IBGE.
Publique a pasta com os DOIS arquivos."""
import gzip, json, time, urllib.request
API = "https://servicodados.ibge.gov.br/api/"
def j(u, tentativas=3):
    # O IBGE às vezes falha; tenta de novo antes de desistir.
    for n in range(tentativas):
        try:
            with urllib.request.urlopen(u, timeout=120) as r:
                b = r.read()
            return json.loads(gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b)  # o IBGE às vezes responde em gzip
        except Exception as e:
            if n == tentativas - 1:
                raise
            print("nova tentativa:", u, e)
            time.sleep(2 * (n + 1))
m = next(x for x in j(API + "v1/localidades/estados/31/mesorregioes") if x["nome"].lower() == "jequitinhonha")
muns = j(API + f"v1/localidades/mesorregioes/{m['id']}/municipios")
ids = {str(x["id"]) for x in muns}
Q = "intrarregiao=municipio&formato=application/vnd.geo+json"
cands = [f"v3/malhas/mesorregioes/{m['id']}?{Q}&qualidade=maxima", f"v4/malhas/estados/31?{Q}&qualidade=maxima",
         f"v3/malhas/mesorregioes/{m['id']}?{Q}&qualidade=4", f"v3/malhas/estados/31?{Q}&qualidade=4", f"v3/malhas/estados/31?{Q}"]
def cod(f):
    pr = f["properties"]
    return str(pr.get("codarea", pr.get("id", pr.get("codigo", ""))))
feats = []
for c in cands:
    try:
        feats = [f for f in j(API + c)["features"] if cod(f) in ids]
        if feats:
            print("usado:", c)
            break
    except Exception as e:
        print("falhou:", c, e)
if not feats:
    raise SystemExit("Nenhuma malha obtida")
def arred(g, nd=6):
    # 6 casas decimais em graus = cerca de 0,1 m: invisível no mapa, e o arquivo fica bem menor.
    if isinstance(g, float):
        return round(g, nd)
    if isinstance(g, list):
        return [arred(x, nd) for x in g]
    return g
for f in feats:
    f["geometry"]["coordinates"] = arred(f["geometry"]["coordinates"])
json.dump({"muns": muns, "features": feats, "fonte": c}, open("dados.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"{len(muns)} municípios na lista, {len(feats)} polígonos gravados em dados.json")

def sidra(t, per, v):
    try:
        g = j(API + f"v3/agregados/{t}/periodos/{per}/variaveis/{v}?localidades=N6[{','.join(sorted(ids))}]")
        out = {}
        for s in g[0]["resultados"][0]["series"]:
            r = {}
            for pe, x in s["serie"].items():
                try:
                    r[pe] = float(str(x).replace(",", "."))
                except ValueError:
                    pass
            out[s["localidade"]["id"]] = r
        return out
    except Exception as e:
        print("falhou:", t, v, e)
        return {}
ind = {"pop": sidra(4714, "all", 93), "area": sidra(4714, "all", 614), "den": sidra(4714, "all", 616),
       "est": sidra(6579, "-1", 9324), "pib": sidra(5938, "all", 37)}
json.dump(ind, open("indicadores.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print({k: len(v) for k, v in ind.items()}, "municípios por indicador em indicadores.json")

# ===== v4: indicadores por categoria (educação e saneamento, Censo 2022) =====
# Os IDs de variável/categoria NÃO são fixos no código: são descobertos pelo NOME no endpoint oficial
# de metadados (v3/agregados/{tabela}/metadados). Se o nome não for achado, o indicador é pulado e avisado.
def meta(t):
    return j(API + f"v3/agregados/{t}/metadados")

def norm(s):
    return " ".join(str(s).lower().split())

def cat_total(cl):
    for c in cl["categorias"]:
        if norm(c["nome"]) == "total":
            return c["id"]
    return None

def por_categoria(t, var_ok, cls_ok, per="2022", so_cats=None):
    """Devolve {municipio: {nome_da_categoria: valor}} para a classificação escolhida (cls_ok(nome)),
    fixando 'Total' nas demais classificações. var_ok(nome) escolhe a variável."""
    try:
        md = meta(t)
        var = next(v for v in md["variaveis"] if var_ok(norm(v["nome"])))
        alvo = next(c for c in md["classificacoes"] if cls_ok(norm(c["nome"])))
        partes = []
        for c in md["classificacoes"]:
            if c["id"] == alvo["id"]:
                cats = [x["id"] for x in c["categorias"] if so_cats is None or norm(x["nome"]) in so_cats]
                partes.append(f"{c['id']}[{','.join(map(str, cats))}]")
            else:
                tid = cat_total(c)
                if tid is None:
                    raise ValueError(f"classificação {c['nome']} sem categoria Total")
                partes.append(f"{c['id']}[{tid}]")
        url = API + f"v3/agregados/{t}/periodos/{per}/variaveis/{var['id']}?localidades=N6[{','.join(sorted(ids))}]&classificacao={'|'.join(partes)}"
        g = j(url)
        out = {}
        for r in g[0]["resultados"]:
            nome = None
            for c in r["classificacoes"]:
                if str(c["id"]) == str(alvo["id"]):
                    nome = list(c["categoria"].values())[0]
            if nome is None:
                continue
            for s in r["series"]:
                v = s["serie"].get(per)
                try:
                    out.setdefault(s["localidade"]["id"], {})[nome] = float(str(v).replace(",", "."))
                except (TypeError, ValueError):
                    pass
        print(f"ok tabela {t}: variável '{var['nome']}' (id {var['id']}), classificação '{alvo['nome']}' (id {alvo['id']}), {len(out)} municípios")
        return out
    except Exception as e:
        print("falhou tabela", t, "->", e)
        return {}

# Alfabetização, 15+ anos (tabela 9542; variável 950 e categorias 1023/1024 conferidas no catálogo do SIDRA)
alf = por_categoria(9542, lambda n: n == "pessoas de 15 anos ou mais de idade", lambda n: n == "alfabetização",
                    so_cats={"alfabetizadas", "não alfabetizadas"})
ind["alf"] = alf
# Esgotamento sanitário (tabela 6805) e destino do lixo (tabela 6892), domicílios particulares permanentes ocupados
ind["esg"] = por_categoria(6805, lambda n: n.startswith("domicílios particulares permanentes ocupados") and "percentual" not in n,
                           lambda n: "esgotamento" in n)
ind["lixo"] = por_categoria(6892, lambda n: n.startswith("domicílios particulares permanentes ocupados") and "percentual" not in n,
                            lambda n: "lixo" in n)
json.dump(ind, open("indicadores.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print({k: len(v) for k, v in ind.items()}, "municípios por indicador (v4)")
for k in ("esg", "lixo"):
    if ind[k]:
        print("categorias de", k + ":", sorted(next(iter(ind[k].values())).keys()))
