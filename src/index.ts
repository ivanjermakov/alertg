import { IncomingMessage, ServerResponse, createServer } from 'http'
import TelegramBot from 'node-telegram-bot-api'
import { exit } from 'process'
import { debug, error, info, request, warn } from './log'

const body = (req: IncomingMessage): Promise<ArrayBuffer> => {
    return new Promise<ArrayBuffer>((resolve, reject) => {
        const chunks: Buffer[] = []
        req.on('data', chunk => chunks.push(chunk))
        req.on('end', () => resolve(joinBuffers(chunks)))
        req.on('error', reject)
    })
}

const joinBuffers = (buffers: Buffer[]): ArrayBuffer => {
    const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const buf of buffers) {
        result.set(buf, offset)
        offset += buf.byteLength
    }
    return result.buffer
}

const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    request(req)
    const host = req.headers.host ?? 'localhost'
    const rawUrl = `http://${host}${req.url ?? '/'}`
    const url = new URL(rawUrl)

    if (url.pathname === '/' && req.method === 'POST') {
        if (!chatId) throw Error('misconfigured bot: chat id not known')
        const bodyText = new TextDecoder().decode(await body(req))
        bot.sendMessage(chatId, bodyText)
        res.statusCode = 200
        res.end()
        return
    }

    res.statusCode = 404
    res.end()
}

let deinitizlized = false
const deinit = async (): Promise<void> => {
    if (deinitizlized) return
    deinitizlized = true
    debug('deinitializing')

    await new Promise<void>((resolve, reject) =>
        server.listening ? server.close(e => (e ? reject(e) : resolve())) : resolve()
    )
    info('deinitialized')
    exit(0)
}

process.on('SIGINT', deinit)
process.on('SIGTERM', deinit)

const server = createServer((req, res) => {
    handleRequest(req, res).catch(e => {
        error('request error', e)
        res.statusCode = 500
        res.end('Server error')
    })
})

const port = Number.parseInt(process.env.ALERTG_PORT ?? '3000', 10)
server.listen(port, () => {
    info(`server started :${port}`)
})

const token = process.env.ALERTG_TOKEN
if (!token) {
    error('no ALERTG_TOKEN')
    exit(1)
}
const receiverId = process.env.ALERTG_RECEIVER_ID ? Number.parseInt(process.env.ALERTG_RECEIVER_ID, 10) : undefined
if (!receiverId) {
    error('no ALERTG_RECEIVER_ID')
    exit(1)
}

const bot = new TelegramBot(token, { polling: true })
let chatId = process.env.ALERTG_CHAT_ID ? Number.parseInt(process.env.ALERTG_CHAT_ID, 10) : undefined

bot.on('message', msg => {
    debug('message', msg)
    if (msg.from?.id !== receiverId) {
        warn('unknown sender id', msg.from?.id)
        return
    }
    chatId ??= msg.chat.id
    bot.sendMessage(chatId, `chat id: ${chatId}`)
})
