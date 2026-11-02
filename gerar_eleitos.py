#!/usr/bin/env python3
"""Gera eleitos.json: prefeitos, vices e vereadores eleitos nos 51 municípios do Vale (eleições municipais 1996–2024).
Fonte: TSE, Dados Abertos (consulta_cand e votacao_candidato_munzona, arquivos de MG).
Uso:  python3 gerar_eleitos.py [pasta_para_guardar_os_downloads]
Só a biblioteca padrão. Baixa cerca de 1,2 GB (uma vez; guarda só o CSV de MG). Usa só nome de urna, partido e votos
(nada de CPF, título ou e-mail). O TSE registra quem foi ELEITO nas urnas, não quem de fato assumiu."""
import csv, io, json, os, sys, tempfile, time, unicodedata, urllib.request, zipfile
from collections import defaultdict

AQUI = os.path.dirname(os.path.abspath(__file__))
PASTA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), "tse_mg")
BASE = "https://cdn.tse.jus.br/estatistica/sead/odsele/"
ANOS = (1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024)
ALIAS = {"GOUVEA": "GOUVEIA"}  # grafia antiga no TSE (1996 e 2000)
ELEITO = {"ELEITO", "ELEITO POR QP", "ELEITO POR MEDIA", "MEDIA"}  # "MÉDIA" aparece em 2004 e 2008
MIN = {"de", "da", "do", "das", "dos", "e", "di", "du"}

def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.upper()) if unicodedata.category(c) != "Mn").strip()

def bonito(s):
    # "MARIA DO CARMO" -> "Maria do Carmo"; algarismos romanos ficam em maiúsculas
    out = []
    for i, w in enumerate(s.lower().split()):
        out.append(w if (i and w in MIN) else w.upper() if w in ("ii", "iii", "iv") else w[:1].upper() + w[1:])
    return " ".join(out)

def baixar(tipo, ano):
    csv_ = os.path.join(PASTA, f"{tipo}_{ano}_MG.csv")
    if os.path.exists(csv_):
        return csv_
    os.makedirs(PASTA, exist_ok=True)
    zp = os.path.join(PASTA, f"{tipo}_{ano}.zip")
    for n in range(4):
        try:
            urllib.request.urlretrieve(f"{BASE}{tipo}/{tipo}_{ano}.zip", zp)
            break
        except Exception as e:
            if n == 3:
                raise
            print("nova tentativa:", tipo, ano, e)
            time.sleep(5 * (n + 1))
    with zipfile.ZipFile(zp) as z:
        nome = next(i for i in z.namelist() if i.upper().endswith("_MG.CSV"))
        with z.open(nome) as a, open(csv_, "wb") as b:
            b.write(a.read())
    os.remove(zp)
    return csv_

def linhas(tipo, ano):
    with open(baixar(tipo, ano), encoding="latin-1", newline="") as f:
        yield from csv.DictReader(f, delimiter=";")

ibge = {sem_acento(m["nome"]): str(m["id"]) for m in json.load(open(os.path.join(AQUI, "dados.json"), encoding="utf-8"))["muns"]}
def mun(nome):
    n = sem_acento(nome)
    return ibge.get(ALIAS.get(n, n))

out = defaultdict(list)
for ano in ANOS:
    # votos e situação de cada candidato (somando as zonas eleitorais)
    cand, votos = {}, defaultdict(int)
    for x in linhas("votacao_candidato_munzona", ano):
        cargo = sem_acento(x["DS_CARGO"])
        m = mun(x["NM_MUNICIPIO"])
        if not m or cargo not in ("PREFEITO", "VEREADOR") or x["NR_TURNO"] != "1":
            continue
        k = (m, x["DS_ELEICAO"], cargo, x["SQ_CANDIDATO"])
        votos[k] += max(0, int(x["QT_VOTOS_NOMINAIS"] or 0))
        cand[k] = (bonito(x["NM_URNA_CANDIDATO"]), x["SG_PARTIDO"], sem_acento(x["DS_SIT_TOT_TURNO"]), x["NR_CANDIDATO"])
    # vice: mesmo número do prefeito, na mesma eleição e município
    vice = {}
    for x in linhas("consulta_cand", ano):
        m = mun(x["NM_UE"])
        if m and sem_acento(x["DS_CARGO"]) == "VICE-PREFEITO" and sem_acento(x["DS_SIT_TOT_TURNO"]) == "ELEITO":
            vice[(m, "SUPLEMENTAR" in sem_acento(x["DS_ELEICAO"]), x["NR_CANDIDATO"])] = (bonito(x["NM_URNA_CANDIDATO"]), x["SG_PARTIDO"])
    pleitos = defaultdict(lambda: {"p": [], "v": []})
    for k, (nome, part, sit, nr) in cand.items():
        if sit in ELEITO:
            pleitos[k[:2]]["p" if k[2] == "PREFEITO" else "v"].append((nome, part, votos[k], nr))
    for (m, eleicao), d in pleitos.items():
        supl = "SUPLEMENTAR" in sem_acento(eleicao)
        if supl and not d["p"]:
            continue
        if len(d["p"]) > 1:
            print(f"AVISO {ano} {m}: {len(d['p'])} prefeitos 'eleitos' em {eleicao}; ficou o mais votado")
            d["p"].sort(key=lambda r: -r[2])
        nome, part, v, nr = d["p"][0] if d["p"] else (None, None, None, None)
        vi = vice.get((m, supl, nr))
        # prefeito None = eleição ordinária em que o eleito teve a candidatura anulada (houve suplementar)
        out[m].append({"a": ano, "s": int(supl),
                       "p": [nome, part, v] + (list(vi) if vi else []) if nome else None,
                       "v": [list(r[:3]) for r in sorted(d["v"], key=lambda r: -r[2])]})
    ord_ = [m for (m, e) in pleitos if "SUPLEMENTAR" not in sem_acento(e)]
    print(ano, len(set(ord_)), "municípios;", sum(len(d["v"]) for d in pleitos.values()), "vereadores;",
          sum(1 for L in out.values() for e in L if e["a"] == ano and e["p"] and len(e["p"]) > 3), "vices;",
          sum(1 for L in out.values() for e in L if e["a"] == ano and not e["p"]), "sem prefeito eleito")
    assert len(set(ord_)) == len(ibge), f"{ano}: faltam municípios no resultado ordinário"

for L in out.values():
    L.sort(key=lambda e: (-e["a"], e["s"]))
res = {"_meta": {"fonte": "TSE, Dados Abertos (repositorio de dados eleitorais)", "gerado": time.strftime("%Y-%m-%d"), "anos": list(ANOS)}}
res.update(dict(sorted(out.items())))
json.dump(res, open(os.path.join(AQUI, "eleitos.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("eleitos.json:", os.path.getsize(os.path.join(AQUI, "eleitos.json")) // 1024, "KB")
