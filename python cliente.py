import asyncio
import websockets
import aioconsole


async def receber_mensagens(websocket):
    try:
        async for mensagem in websocket:
            print(f"\n{mensagem}")
    except websockets.exceptions.ConnectionClosed:
        print("\nConexão encerrada.")


async def enviar_mensagens(websocket):
    while True:
        mensagem = await aioconsole.ainput()
        if mensagem.strip():
            await websocket.send(mensagem)


async def main():
    ip_servidor = input("IP do servidor (ou 'localhost'): ").strip()
    if not ip_servidor:
        ip_servidor = "localhost"

    uri = f"ws://{ip_servidor}:8765"

    try:
        async with websockets.connect(uri) as websocket:
            print("\nConectado! Digite seu nome:")
            task_receber = asyncio.create_task(receber_mensagens(websocket))
            task_enviar = asyncio.create_task(enviar_mensagens(websocket))
            await asyncio.gather(task_receber, task_enviar)
    except Exception as e:
        print(f"Falha ao conectar: {e}")


if __name__ == "__main__":
    asyncio.run(main())   
