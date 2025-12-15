import { IncomingMessage, ServerResponse, createServer } from 'http'
import { exit } from 'process'
import { debug, error, info, request } from './log'

const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    request(req)
    const host = req.headers.host ?? 'localhost'
    const rawUrl = `http://${host}${req.url ?? '/'}`
    const url = new URL(rawUrl)

    if (url.pathname === '/notify' && req.method === 'POST') {
        debug('todo')
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
