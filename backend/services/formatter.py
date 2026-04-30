from datetime import date


def payment_reminder_message(
    match_date: date,
    pending_names: list[str],
    fee: float,
    pix_key: str = "",
) -> str:
    """Build a WhatsApp-ready payment reminder listing unpaid players."""
    names_block = "\n".join(f"  - {name}" for name in pending_names)
    pix_line = f"\nChave PIX: *{pix_key}*" if pix_key else ""
    return (
        f"Pelada {match_date.strftime('%d/%m')} — pagamento pendente:\n\n"
        f"{names_block}\n\n"
        f"Valor: *R$ {fee:.2f}*{pix_line}"
    )
