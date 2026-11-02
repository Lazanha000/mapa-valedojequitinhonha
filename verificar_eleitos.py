#!/usr/bin/env python3
"""Confere o eleitos.json do site contra os arquivos oficiais do TSE e grava um relatório em TXT.
Uso:  python3 verificar_eleitos.py PASTA_COM_OS_CSV_DE_MG SAIDA.txt
A pasta precisa ter, para cada ano, os CSV de MG de: consulta_cand, votacao_candidato_munzona,
consulta_vagas, detalhe_votacao_munzona e votacao_partido_munzona (e o downloads.json com URL e SHA-256).

Não reaproveita nada do gerador: relê os CSV e confere, para cada município e eleição,
(A) o site contra o arquivo de votação, (B) o arquivo de votação contra o de candidaturas (consulta_cand),
(C) vagas de vereador, (D) totais de votos contra o detalhe da votação e contra a votação por partido,
(E) prefeito = mais votado e (F) vice da mesma chapa do prefeito."""
import csv, gzip, json, os, sys, time, unicodedata
from collections import defaultdict

AQUI = os.path.dirname(os.path.abspath(__file__))
PASTA, SAIDA = sys.argv[1], sys.argv[2]
ANOS = (1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024)
ELEITO = {"ELEITO", "ELEITO POR QP", "ELEITO POR MEDIA", "MEDIA"}

def sa(s):
    return " ".join("".join(c for c in unicodedata.normalize("NFD", (s or "").upper().replace("º", ".")) if unicodedata.category(c) != "Mn").split())
def linhas(tipo, ano):
    arq = os.path.join(PASTA, f"{tipo}_{ano}_MG.csv")
    abrir = (lambda: open(arq, encoding="latin-1", newline="")) if os.path.exists(arq) else (lambda: gzip.open(arq + ".gz", "rt", encoding="latin-1", newline=""))  # aceita a prova bruta em .csv.gz
    with abrir() as f:
        yield from csv.DictReader(f, delimiter=";")
def num(v):
    try:
        return max(0, int(v))
    except (TypeError, ValueError):
        return 0
def br(n):
    return f"{n:,}".replace(",", ".")

muns = json.load(open(os.path.join(AQUI, "dados.json"), encoding="utf-8"))["muns"]
NOME = {str(m["id"]): m["nome"] for m in muns}
ibge = {sa(m["nome"]): str(m["id"]) for m in muns}
ibge["GOUVEA"] = ibge["GOUVEIA"]  # grafia antiga no TSE
mun = lambda n: ibge.get(sa(n))
J = json.load(open(os.path.join(AQUI, "eleitos.json"), encoding="utf-8"))
DL = json.load(open(os.path.join(PASTA, "downloads.json"), encoding="utf-8"))

R, falhas, avisos = [], [], []
cont = defaultdict(lambda: [0, 0, 0])  # verificação -> [ok, falha, divergência explicada entre arquivos do TSE]
def chk(nome, ok, ano, m, txt, explicada=None):
    """explicada: texto quando a diferença é entre arquivos do próprio TSE e não muda o que o site mostra"""
    if ok:
        cont[nome][0] += 1; return "ok"
    if explicada:
        cont[nome][2] += 1; avisos.append(f"{ano} {NOME[m]} [{nome}]: {txt} -> {explicada}"); return "divergência no TSE (ver observações)"
    cont[nome][1] += 1; falhas.append(f"{ano} {NOME[m]} [{nome}]: {txt}"); return "FALHA"

for ano in ANOS:
    vag = {}
    for x in linhas("consulta_vagas", ano):
        m = mun(x["NM_UE"])
        if m:
            vag[(m, sa(x["DS_ELEICAO"]), sa(x["DS_CARGO"]))] = num(x.get("QT_VAGA", x.get("QT_VAGAS")))
    cons, cons_el, vice_el = {}, defaultdict(set), defaultdict(list)
    for x in linhas("consulta_cand", ano):
        m = mun(x["NM_UE"])
        if not m:
            continue
        c, el, st = sa(x["DS_CARGO"]), sa(x["DS_ELEICAO"]), sa(x["DS_SIT_TOT_TURNO"])
        cons[(m, el, x["SQ_CANDIDATO"])] = x  # até 2008 o SQ se repete entre municípios
        if st in ELEITO:
            if c == "VICE-PREFEITO":
                vice_el[(m, el)].append(x)
            else:
                cons_el[(m, el, c)].add(x["SQ_CANDIDATO"])
    pes = defaultdict(lambda: {"por_sq": defaultdict(int), "sit": set(), "nr": None})
    grupos = defaultdict(lambda: defaultdict(int))   # (m, el, cargo, nr, zona, trânsito) -> {sq: votos}
    grupos_p = defaultdict(lambda: defaultdict(int)) # idem, separado por partido (o arquivo de partido segue o partido de cada SQ)
    nr_de = {}
    vot_el = defaultdict(set)
    eleicoes = defaultdict(set)
    for x in linhas("votacao_candidato_munzona", ano):
        m, c = mun(x["NM_MUNICIPIO"]), sa(x["DS_CARGO"])
        if not m or c not in ("PREFEITO", "VEREADOR") or x["NR_TURNO"] != "1":
            continue
        el = sa(x["DS_ELEICAO"]); eleicoes[m].add(el)
        v = num(x["QT_VOTOS_NOMINAIS_VALIDOS"]) if "QT_VOTOS_NOMINAIS_VALIDOS" in x else num(x["QT_VOTOS_NOMINAIS"])
        p = pes[(m, el, c, sa(x["NM_URNA_CANDIDATO"]), sa(x["SG_PARTIDO"]))]
        p["por_sq"][x["SQ_CANDIDATO"]] += v; p["sit"].add(sa(x["DS_SIT_TOT_TURNO"])); p["nr"] = x["NR_CANDIDATO"]
        z = (x["NR_CANDIDATO"], x["NR_ZONA"], x.get("ST_VOTO_EM_TRANSITO", ""))
        grupos[(m, el, c) + z][x["SQ_CANDIDATO"]] += v
        grupos_p[(m, el, c, sa(x["SG_PARTIDO"])) + z][x["SQ_CANDIDATO"]] += v
        nr_de[(m, el, c, x["SQ_CANDIDATO"])] = x["NR_CANDIDATO"]
        if sa(x["DS_SIT_TOT_TURNO"]) in ELEITO:
            vot_el[(m, el, c)].add(x["SQ_CANDIDATO"])
    # linhas repetidas (mesmo número e zona, dois SQ com os mesmos votos: cadastro duplicado ou candidato substituído) contam uma vez só
    um = lambda d: list(d.values())[0] if len(set(d.values())) == 1 else sum(d.values())
    tot, tot_p, por_nr = defaultdict(int), defaultdict(int), defaultdict(int)
    for (m, el, c, nr, z, t), d in grupos.items():
        tot[(m, el, c)] += um(d); por_nr[(m, el, c, nr)] += um(d)
    for (m, el, c, pt, nr, z, t), d in grupos_p.items():
        tot_p[(m, el, c, pt)] += um(d)
    det = defaultdict(int)
    for x in linhas("detalhe_votacao_munzona", ano):
        m, c = mun(x["NM_MUNICIPIO"]), sa(x["DS_CARGO"])
        if m and x["NR_TURNO"] == "1":
            det[(m, sa(x["DS_ELEICAO"]), c)] += num(x.get("QT_VOTOS_NOMINAIS_VALIDOS"))
    vp, vp_ano = defaultdict(int), defaultdict(int)
    for x in linhas("votacao_partido_munzona", ano):
        m, c = mun(x["NM_MUNICIPIO"]), sa(x["DS_CARGO"])
        if m and x["NR_TURNO"] == "1":
            v = num(x["QT_VOTOS_NOMINAIS_VALIDOS"] if "QT_VOTOS_NOMINAIS_VALIDOS" in x else x["QT_VOTOS_NOMINAIS"])
            vp[(m, sa(x["DS_ELEICAO"]), c, sa(x["SG_PARTIDO"]))] += v
            vp_ano[sa(x["SG_PARTIDO"])] += v

    R.append(f"\n{'=' * 78}\nELEIÇÃO MUNICIPAL DE {ano} (mandato {ano + 1}–{ano + 4})\n{'=' * 78}")
    for m in sorted(NOME, key=lambda k: sa(NOME[k])):
        ents = [e for e in J.get(m, []) if e["a"] == ano]
        ords = sorted(el for el in eleicoes[m] if "SUPLEMENTAR" not in el)
        supls = sorted(el for el in eleicoes[m] if "SUPLEMENTAR" in el)
        chk("eleição ordinária presente no site", len([e for e in ents if not e["s"]]) == 1 and len(ords) == 1, ano, m, "falta a eleição ordinária no site")
        for e in ents:
            if e["s"]:
                el = next((s for s in supls if e["p"] and (m, s, "PREFEITO", sa(e["p"][0]), sa(e["p"][1])) in pes), "?")
            else:
                el = ords[0] if ords else "?"
            R.append(f"\n{NOME[m]} (IBGE {m}) — {ano}" + (" — ELEIÇÃO SUPLEMENTAR" if e["s"] else "") + f"   [TSE: {el}]")
            cargos = ["PREFEITO"] + ([] if e["s"] else ["VEREADOR"])
            # (A) site x arquivo de votação
            for c in cargos:
                site = ([(sa(e["p"][0]), sa(e["p"][1]), e["p"][2])] if e["p"] else []) if c == "PREFEITO" else [(sa(x[0]), sa(x[1]), x[2]) for x in e["v"]]
                arq = {(k[3], k[4]): max(p["por_sq"].values()) for k, p in pes.items() if k[:3] == (m, el, c) and p["sit"] & ELEITO}
                ok = len(site) == len(arq) and all((u, pt) in arq and arq[(u, pt)] == v for u, pt, v in site)
                sa_ = chk(f"site = arquivo de votação ({c.lower()})", ok, ano, m, f"site {sorted(site)} x votação {sorted(arq.items())}")
                # (B) votação x consulta_cand, pelo número interno do candidato (SQ)
                a, b = vot_el[(m, el, c)], cons_el[(m, el, c)]
                ausentes = [s for s in a - b if (m, el, s) not in cons]
                exp = None
                if a != b and ausentes and not (b - a) and all((m, el, s) not in cons for s in a - b):
                    exp = "o eleito no arquivo de votação não tem registro no consulta_cand (candidato substituto não cadastrado); vale o arquivo de votação"
                sb = chk(f"votação = consulta_cand ({c.lower()})", a == b, ano, m, f"só na votação {sorted(a - b)}, só no consulta_cand {sorted(b - a)}", exp)
                # (D) totais
                t, d = tot[(m, el, c)], det.get((m, el, c), 0)
                sd = chk("total de votos = detalhe da votação", t == d, ano, m, f"{c}: candidatos {t}, detalhe {d}")
                difs = [(pt, v, vp.get((m, el, c, pt), 0)) for (mm, ee, cc, pt), v in tot_p.items() if (mm, ee, cc) == (m, el, c) and vp.get((m, el, c, pt), 0) != v]
                exp = None
                if difs and all(vp_ano[pt] == 0 for pt, _, _ in difs):
                    exp = f"o arquivo de votação por partido de {ano} não traz votos de {', '.join(sorted({pt for pt, _, _ in difs}))} em nenhum município de MG (arquivo incompleto)"
                sp = chk("votos por partido = votação por partido", not difs, ano, m, f"{c}: (partido, candidatos, arquivo de partido) {difs}", exp)
                if c == "PREFEITO":
                    if e["p"]:
                        cv = sorted(((v, nr) for (mm, ee, cc, nr), v in por_nr.items() if (mm, ee, cc) == (m, el, c)), reverse=True)
                        nr_el = {nr_de[(m, el, c, s)] for s in a}
                        se = chk("prefeito é o mais votado", bool(cv) and cv[0][1] in nr_el and (len(cv) == 1 or cv[0][0] > cv[1][0]), ano, m, f"mais votados {cv[:2]}, número do eleito {nr_el}")
                        R.append(f"  Prefeito: {e['p'][0]} ({e['p'][1]}) — {e['p'][5] or 'sem nome completo no TSE'} — {br(e['p'][2])} votos")
                        R.append(f"     conferências: votação {sa_}; consulta_cand {sb}; mais votado {se}; total {br(t)} = detalhe {sd}; partidos {sp}")
                        if ano >= 2012:
                            vi = vice_el[(m, el)]
                            nr_pref = next((cons[(m, el, s)]["NR_CANDIDATO"] for s in a if (m, el, s) in cons), None)
                            okv = bool(e["p"][3]) and len(vi) == 1 and sa(vi[0]["NM_URNA_CANDIDATO"]) == sa(e["p"][3]) and vi[0]["NR_CANDIDATO"] == nr_pref
                            sv = chk("vice da mesma chapa (consulta_cand)", okv, ano, m, f"vice site {e['p'][3]} x consulta {[(r['NM_URNA_CANDIDATO'], r['NR_CANDIDATO']) for r in vi]}, número do prefeito {nr_pref}")
                            R.append(f"  Vice: {e['p'][3]} ({e['p'][4]}) — {e['p'][6] or ''}   [mesma chapa: {sv}]")
                        else:
                            R.append(f"  Vice: o TSE não publica o vice eleito em {ano} (situação #NULO no consulta_cand)")
                    else:
                        R.append(f"  Prefeito: eleição anulada — nenhum candidato a prefeito consta como eleito no TSE   [votação {sa_}; consulta_cand {sb}]")
                        avisos.append(f"{ano} {NOME[m]}: na eleição ordinária ninguém consta como prefeito eleito no TSE; houve eleição suplementar.")
                else:
                    nv = vag.get((m, el, "VEREADOR"))
                    exp = None
                    if nv != len(e["v"]) and len(a) == len(b) == len(e["v"]):
                        exp = f"o consulta_vagas diz {nv} vagas, mas os dois arquivos de candidatos têm {len(e['v'])} eleitos; o site mostra os {len(e['v'])} eleitos"
                    sc = chk("eleitos = vagas de vereador", nv == len(e["v"]), ano, m, f"vagas {nv}, eleitos {len(e['v'])}", exp)
                    R.append(f"  Vereadores: {len(e['v'])} eleitos, {nv} vagas")
                    R.append(f"     conferências: votação {sa_}; consulta_cand {sb}; vagas {sc}; total {br(t)} = detalhe {sd}; partidos {sp}")
                    for x in e["v"]:
                        R.append(f"    {x[0]} ({x[1]}) — {x[3] or 'sem nome completo no TSE'} — {br(x[2])} votos")

# ---------- cabeçalho ----------
tok = sum(v[0] for v in cont.values()); tf = sum(v[1] for v in cont.values()); te = sum(v[2] for v in cont.values())
H = [
 "VERIFICAÇÃO DOS PREFEITOS, VICES E VEREADORES ELEITOS",
 "Mapa do Vale do Jequitinhonha (Polis Jequitinhonha) — 51 municípios, eleições municipais de 1996 a 2024",
 f"Gerado em {time.strftime('%Y-%m-%d %H:%M')} por verificar_eleitos.py, conferindo o eleitos.json do site (gerado em {J['_meta'].get('gerado')}).",
 "",
 "O QUE ESTE ARQUIVO PROVA",
 "Cada nome, partido e número de votos do site foi conferido contra arquivos oficiais do TSE (Repositório de Dados Eleitorais).",
 "O site é gerado do arquivo de votação. Este relatório relê tudo do zero e confere com mais quatro arquivos do TSE:",
 "  (A) site x arquivo de votação: mesmos eleitos, mesmo partido, mesmos votos;",
 "  (B) arquivo de votação x consulta_cand (cadastro das candidaturas): mesmos eleitos, pelo número interno do candidato;",
 "  (C) consulta_vagas: número de vereadores eleitos = número de vagas da câmara;",
 "  (D) detalhe_votacao_munzona e votacao_partido_munzona: o total de votos e o total por partido batem;",
 "  (E) o prefeito eleito é o candidato mais votado;  (F) o vice é da mesma chapa (mesmo número) do prefeito.",
 "",
 "LIMITES (o que este arquivo NÃO prova)",
 "  - O TSE registra quem foi ELEITO nas urnas, não quem assumiu: cassações, renúncias e suplentes que assumiram não aparecem.",
 "  - De 1996 a 2008 o TSE não publica o vice eleito; o site mostra 'sem registro'.",
 "  - Nomes de urna saem como no arquivo de votação (é o nome que estava na urna); o nome completo vem do consulta_cand.",
 "  - Partidos com a sigla da época da eleição (ex.: PEN em 2016, que depois virou Patriota).",
 "",
 "RESUMO DAS CONFERÊNCIAS                                       ok   falha  divergência entre arquivos do TSE",
]
for k, (o, f, e) in sorted(cont.items()):
    H.append(f"  {k:<55} {o:>6} {f:>6} {e:>6}")
H += [f"  {'TOTAL':<55} {tok:>6} {tf:>6} {te:>6}", ""]
H += ["FALHAS (erros no site)"] + ([f"  {x}" for x in falhas] or ["  nenhuma"]) + [""]
H += ["OBSERVAÇÕES (divergências dentro dos próprios arquivos do TSE e situações reais; o site segue o que está explicado)"] + [f"  - {a}" for a in avisos] + [""]
H.append("ARQUIVOS DO TSE USADOS (endereço oficial, data do download e SHA-256 do .zip, para conferir que é o mesmo arquivo)")
for k in sorted(DL):
    d = DL[k]
    H.append(f"  {d['url']}\n      baixado em {d['baixado_em']}; arquivo interno {d['arquivo_no_zip']}; SHA-256 {d['sha256_zip']}")
H += ["", "LISTA COMPLETA, MUNICÍPIO POR MUNICÍPIO"]
open(SAIDA, "w", encoding="utf-8").write("\n".join(H + R) + "\n")
print(f"{tok} ok, {tf} falhas, {te} divergências do TSE explicadas -> {SAIDA}")
for x in falhas[:40]:
    print("FALHA", x)
