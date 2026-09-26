import asyncio
import websockets

clientes_conectados = {}  # {websocket: "Nome"}


async def gerenciar_cliente(websocket):
    nome_usuario = None

    try:
        async for mensagem in websocket:
            if not nome_usuario:
                nome_candidato = mensagem.strip()

                if nome_candidato in clientes_conectados.values():
                    await websocket.send(
                        "ERRO: Este nome já está em uso. Escolha outro:"
                    )
                elif not nome_candidato:
                    await websocket.send(
                        "ERRO: O nome não pode ser vazio. Digite um nome:"
                    )
                else:
                    nome_usuario = nome_candidato
                    clientes_conectados[websocket] = nome_usuario
                    await websocket.send(f"OK: Bem-vindo, {nome_usuario}!")
                    await transmitir(f"*** {nome_usuario} entrou no chat ***",
                                     remetente=websocket)
            else:
                texto_formatado = f"[{nome_usuario}]: {mensagem}"
                await transmitir(texto_formatado, remetente=websocket)

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        if websocket in clientes_conectados:
            nome_removido = clientes_conectados.pop(websocket)
            await transmitir(f"*** {nome_removido} saiu do chat ***")


async def transmitir(mensagem, remetente=None):
    for cliente in list(clientes_conectados.keys()):
        if cliente != remetente:
            await cliente.send(mensagem)


async def main():
    async with websockets.serve(gerenciar_cliente, "0.0.0.0", 8765):
        print("Servidor de chat rodando na porta 8765...")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())   
