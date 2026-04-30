def mensagem_cobranca(data_pelada, pendentes, valor, chave_pix=""):
    nomes = "\n".join(f"  - {nome}" for nome in pendentes)
    pix_linha = f"\nChave PIX: *{chave_pix}*" if chave_pix else ""
    return (
        f"Pelada {data_pelada.strftime('%d/%m')} — pagamento pendente:\n\n"
        f"{nomes}\n\n"
        f"Valor: *R$ {valor:.2f}*{pix_linha}"
    )
