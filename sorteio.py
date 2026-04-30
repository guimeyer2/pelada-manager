"""
Algoritmo de balanceamento de times por média de rating.

Para 6x6 (2 times A e B) e 5v5v5 (3 times A, B e C).
Usa uma abordagem greedy: ordena jogadores por rating decrescente
e distribui em snake draft, que é simples e produz times bem balanceados.
"""

from typing import NamedTuple


class JogadorParaSorteio(NamedTuple):
    id: int
    nome: str
    rating: float


def sortear_times(
    jogadores: list[JogadorParaSorteio],
    num_times: int,
) -> tuple[dict[str, list[JogadorParaSorteio]], dict[str, float]]:
    """
    Distribui jogadores em `num_times` times equilibrados usando snake draft.

    Retorna:
        - dict com chaves "A", "B" (e "C" se num_times=3) mapeando para lista de jogadores
        - dict com média de rating por time
    """
    if num_times not in (2, 3):
        raise ValueError("num_times deve ser 2 (6x6) ou 3 (5v5v5)")

    labels = ["A", "B", "C"][:num_times]
    times: dict[str, list[JogadorParaSorteio]] = {label: [] for label in labels}

    ordenados = sorted(jogadores, key=lambda j: j.rating, reverse=True)

    # Snake draft: 0,1,2,2,1,0,0,1,2,...
    # Para 2 times: 0,1,1,0,0,1,...
    # Para 3 times: 0,1,2,2,1,0,0,1,2,...
    for i, jogador in enumerate(ordenados):
        ciclo = i // num_times
        posicao_no_ciclo = i % num_times
        if ciclo % 2 == 0:
            idx = posicao_no_ciclo
        else:
            idx = (num_times - 1) - posicao_no_ciclo
        times[labels[idx]].append(jogador)

    medias = {
        label: round(sum(j.rating for j in lista) / len(lista), 2) if lista else 0.0
        for label, lista in times.items()
    }

    return times, medias


def determinar_formato(total_jogadores: int) -> tuple[str, float] | tuple[None, None]:
    """
    Retorna (formato, valor_por_jogador) baseado na quantidade de confirmados.
    Retorna (None, None) se o número não corresponde a nenhum formato.
    """
    if total_jogadores == 12:
        return "6x6", 28.75
    if total_jogadores == 15:
        return "5v5v5", 30.70
    return None, None
