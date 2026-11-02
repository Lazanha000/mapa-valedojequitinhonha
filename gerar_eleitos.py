#!/usr/bin/env python3
"""Gera eleitos.json: prefeitos, vices e vereadores eleitos nos 51 municípios do Vale (eleições municipais 1996–2024).
Fonte: TSE, Dados Abertos (votacao_candidato_munzona e consulta_cand, arquivos de MG).
Uso:  python3 gerar_eleitos.py PASTA_COM_OS_CSV_DE_MG
      (a pasta é a mesma que verificar_eleitos.py usa; baixe com o mesmo script de download)
Guarda nome de urna, nome completo, partido e votos (nada de CPF, título ou e-mail).
O TSE registra quem foi ELEITO nas urnas, não quem de fato assumiu.

Cuidados (todos achados conferindo os arquivos):
- a mesma pessoa pode ter dois SQ_CANDIDATO no mesmo pleito (2000): junta-se por número + nome de urna;
- o mesmo número pode ser de duas pessoas (substituição, candidatura indeferida): pessoas diferentes ficam separadas;
- em 2000 a coluna QT_VOTOS_NOMINAIS vem zerada e os votos estão em QT_VOTOS_NOMINAIS_VALIDOS: usa-se a de válidos quando existe;
- o número do candidato pode mudar entre os arquivos (Capelinha 2008): o vice é achado pelo número que o prefeito tem no consulta_cand."""
import csv, gzip, json, os, sys, time, unicodedata
from collections import defaultdict

AQUI = os.path.dirname(os.path.abspath(__file__))
PASTA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, "tse")
ANOS = (1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024)
ALIAS = {"GOUVEA": "GOUVEIA"}  # grafia antiga no TSE (1996 e 2000)
ELEITO = {"ELEITO", "ELEITO POR QP", "ELEITO POR MEDIA", "MEDIA"}  # "MÉDIA" aparece em 2004 e 2008
MIN = {"de", "da", "do", "das", "dos", "e", "di", "du"}

def sa(s):
    """sem acento, maiúsculas, espaços normais ("1º turno" e "1. turno" ficam iguais: os arquivos do TSE usam os dois)"""
    return " ".join("".join(c for c in unicodedata.normalize("NFD", s.upper().replace("º", ".")) if unicodedata.category(c) != "Mn").split())

def bonito(s):
    # "MARIA DO CARMO" -> "Maria do Carmo"; algarismos romanos ficam em maiúsculas
    out = []
    for i, w in enumerate(s.lower().split()):
        out.append(w if (i and w in MIN) else w.upper() if w in ("ii", "iii", "iv") else w[:1].upper() + w[1:])
    return " ".join(out)

def linhas(tipo, ano):
    arq = os.path.join(PASTA, f"{tipo}_{ano}_MG.csv")
    abrir = (lambda: open(arq, encoding="latin-1", newline="")) if os.path.exists(arq) else (lambda: gzip.open(arq + ".gz", "rt", encoding="latin-1", newline=""))  # aceita a prova bruta em .csv.gz
    with abrir() as f:
        yield from csv.DictReader(f, delimiter=";")

ibge = {sa(m["nome"]): str(m["id"]) for m in json.load(open(os.path.join(AQUI, "dados.json"), encoding="utf-8"))["muns"]}
def mun(nome):
    n = sa(nome)
    return ibge.get(ALIAS.get(n, n))

def votos(x):
    v = x.get("QT_VOTOS_NOMINAIS_VALIDOS")
    if v is None or v == "":
        v = x["QT_VOTOS_NOMINAIS"]
    return max(0, int(v or 0))

def pleitos(ano):
    """{(municipio, eleicao): {"p": [...], "v": [...]}} com os eleitos de um ano, já agrupados por pessoa."""
    cons, vice = {}, {}
    for x in linhas("consulta_cand", ano):
        m = mun(x["NM_UE"])
        if not m:
            continue
        cargo, el = sa(x["DS_CARGO"]), sa(x["DS_ELEICAO"])
        cons[(m, el, x["SQ_CANDIDATO"])] = x  # até 2008 o SQ se repete entre municípios: a chave inclui o município
        if cargo == "VICE-PREFEITO" and sa(x["DS_SIT_TOT_TURNO"]) == "ELEITO":
            vice[(m, el, x["NR_CANDIDATO"])] = x
    pes = {}
    for x in linhas("votacao_candidato_munzona", ano):
        m, cargo = mun(x["NM_MUNICIPIO"]), sa(x["DS_CARGO"])
        if not m or cargo not in ("PREFEITO", "VEREADOR") or x["NR_TURNO"] != "1":
            continue
        el = sa(x["DS_ELEICAO"])
        k = (m, el, cargo, x["NR_CANDIDATO"], sa(x["NM_URNA_CANDIDATO"]))
        d = pes.setdefault(k, {"por_sq": defaultdict(int), "sit": set(), "urna": x["NM_URNA_CANDIDATO"], "part": x["SG_PARTIDO"].strip()})
        d["por_sq"][x["SQ_CANDIDATO"]] += votos(x)
        d["sit"].add(sa(x["DS_SIT_TOT_TURNO"]))
    out = defaultdict(lambda: {"p": [], "v": []})
    for (m, el, cargo, nr, _), d in pes.items():
        if not d["sit"] & ELEITO:
            continue
        sqs = sorted(d["por_sq"])
        c = next((cons[(m, el, s)] for s in sqs if (m, el, s) in cons), None)
        nome = bonito(c["NM_CANDIDATO"]) if c else ""
        # mesma pessoa com dois SQ (2000): as linhas vêm repetidas, então vale o total de um SQ só, não a soma
        reg = {"urna": bonito(d["urna"]), "nome": nome, "part": d["part"], "votos": max(d["por_sq"].values()), "nr_cons": c["NR_CANDIDATO"] if c else nr}
        out[(m, el)]["p" if cargo == "PREFEITO" else "v"].append(reg)
    return out, vice

res = defaultdict(list)
avisos = []
for ano in ANOS:
    pl, vice = pleitos(ano)
    for (m, el), d in pl.items():
        supl = "SUPLEMENTAR" in el
        if supl and not d["p"]:
            continue
        if len(d["p"]) > 1:
            avisos.append(f"{ano} {m} {el}: {len(d['p'])} prefeitos eleitos; fica o mais votado")
            d["p"].sort(key=lambda r: -r["votos"])
        p = d["p"][0] if d["p"] else None
        pv = None
        if p:
            vi = vice.get((m, el, p["nr_cons"]))
            pv = [p["urna"], p["part"], p["votos"],
                  bonito(vi["NM_URNA_CANDIDATO"]) if vi else None, vi["SG_PARTIDO"].strip() if vi else None,
                  p["nome"], bonito(vi["NM_CANDIDATO"]) if vi else None]
        res[m].append({"a": ano, "s": int(supl), "p": pv,
                       "v": [[r["urna"], r["part"], r["votos"], r["nome"]] for r in sorted(d["v"], key=lambda r: (-r["votos"], r["urna"]))]})
    print(ano, len({m for (m, el) in pl if "SUPLEMENTAR" not in el}), "municípios;", sum(len(d["v"]) for d in pl.values()), "vereadores", flush=True)

for L in res.values():
    L.sort(key=lambda e: (-e["a"], e["s"]))
saida = {"_meta": {"fonte": "TSE, Dados Abertos (votacao_candidato_munzona e consulta_cand, MG)", "gerado": time.strftime("%Y-%m-%d"),
                   "anos": list(ANOS), "campos": {"p": "[urna, partido, votos, vice_urna, vice_partido, nome_completo, vice_nome_completo]",
                                                   "v": "[urna, partido, votos, nome_completo]"}}}
saida.update(dict(sorted(res.items())))
json.dump(saida, open(os.path.join(AQUI, "eleitos.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
for a in avisos:
    print("AVISO", a)
print("eleitos.json:", os.path.getsize(os.path.join(AQUI, "eleitos.json")) // 1024, "KB")
