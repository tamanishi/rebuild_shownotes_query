import 'hono'
import { jsxRenderer } from 'hono/jsx-renderer'

declare module 'hono' {
    interface ContextRenderer {
        (content: string | Promise<string>, props?: { title?: string }): Response
    }
}

export const renderer = jsxRenderer(
    ({ children, title }) => {
        return (
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <link href="/static/style.css" rel="stylesheet" />
                    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
                    <title>{title}</title>
                </head>
                <body>
                    {children}
                    <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "031832151d1e4eb98cd8a98c2399712f"}'></script>
                </body>
            </html>
        )
    },
    {
        docType: true
    }
)
