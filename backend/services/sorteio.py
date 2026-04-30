from typing import NamedTuple

class JogadorParaSorteio(NamedTuple):
    id: int
    nome: str
    rating: float

def sortear_times(jogadores, num_times):
    if num_times not in (2, 3):
        raise ValueError("num_times deve ser 2 ou 3")
    labels = ["A", "B", "C"][:num_times]
    times = {label: [] for label in labels}
    ordenados = sorted(jogadores, key=lambda j: j.rating, reverse=True)
    for i, jogador in enumerate(ordenados):
        ciclo = i // num_times
        posicao = i % num_times
        idx = posicao if ciclo % 2 == 0 else (num_times - 1) - posicao
        times[labels[idx]].append(jogador)
    medias = {
        label: round(sum(j.rating for j in lista) / len(lista), 2) if lista else 0.0
        for label, lista in times.items()
    }
    return times, medias

def determinar_formato(total_jogadores):
    if total_jogadores == 12:
        return "6x6", 28.75
    if total_jogadores == 15:
        return "5v5v5", 30.70
    return None, None
