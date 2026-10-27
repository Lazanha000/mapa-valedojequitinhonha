#!/usr/bin/env python3
"""Baixa a malha oficial do IBGE (Mesorregião Jequitinhonha, municípios, qualidade máxima)
e grava dados.json ao lado do index.html. Rode uma vez, com internet:  python3 gerar_dados_offline.py
Depois, publique a pasta com o dados.json: o site deixa de depender do IBGE."""
import json, urllib.request
API = "https://servicodados.ibge.gov.br/api/"
def j(u):
    with urllib.request.urlopen(u, timeout=120) as r:
        return json.load(r)
m = next(x for x in j(API + "v1/localidades/estados/31/mesorregioes") if x["nome"].lower() == "jequitinhonha")
muns = j(API + f"v1/localidades/mesorregioes/{m['id']}/municipios")
ids = {str(x["id"]) for x in muns}
Q = "intrarregiao=municipio&formato=application/vnd.geo+json"
cands = [f"v4/malhas/estados/31?{Q}&qualidade=maxima", f"v3/malhas/mesorregioes/{m['id']}?{Q}&qualidade=4",
         f"v3/malhas/estados/31?{Q}&qualidade=4", f"v3/malhas/estados/31?{Q}"]
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
json.dump({"muns": muns, "features": feats, "fonte": c}, open("dados.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(f"{len(muns)} municípios na lista, {len(feats)} polígonos gravados em dados.json")
