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
q = "intrarregiao=municipio&qualidade=maxima&formato=application/vnd.geo+json"
try:
    g = j(API + f"v3/malhas/mesorregioes/{m['id']}?{q}")
    feats = g["features"]
except Exception:
    ids = {str(x["id"]) for x in muns}
    feats = [f for f in j(API + f"v3/malhas/estados/31?{q}")["features"] if str(f["properties"]["codarea"]) in ids]
json.dump({"muns": muns, "features": feats}, open("dados.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(f"{len(muns)} municípios na lista, {len(feats)} polígonos gravados em dados.json")
