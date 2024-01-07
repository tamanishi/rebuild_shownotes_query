import { Hono } from 'hono'
import { renderer } from './renderer'
import { drizzle } from 'drizzle-orm/d1'
import { union } from 'drizzle-orm/sqlite-core'
import { sql, and, or, eq, notLike, like, desc } from 'drizzle-orm'
import { DateTime } from 'luxon'
import { episodes, shownotes } from './schema'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('*', renderer)

type Episode = {
  title: string,
  link: string,
  pubDate: string,
  shownotes: Shownote[]
}

type Shownote = {
  title: string,
  link: string
}

app.get('/', (c) => {
  return c.render(<div class="container mx-10 my-auto">
    <h1 class="my-4 text-4xl">Rebuild Shownote Search</h1>
    <input class="pl-2 w-96 h-10 border-2 rounded-xl" type="search"
      name="query" placeholder="Type To Search Epiosodes, Shownotes..."
      hx-post="/search"
      hx-trigger="load, input changed delay:500ms"
      hx-target="#search-results" />

    <div id="search-results"></div>
  </div>, {
    title: 'Rebuild Shownotes Search'
  })
})

app.post('/search', async (c) => {
  const body = await c.req.parseBody()
  const query = body['query'] ??= ''

  const db = drizzle(c.env.DB)
  const result = await union(
    db.selectDistinct(
      {
        e_id: sql<number>`${episodes.id}`.as('e_id'),
        e_title: sql<string>`${episodes.title}`.as('e_title'),
        e_link: sql<string>`${episodes.link}`.as('e_link'),
        e_pubDate: episodes.pubDate,
        s_id: sql<number>`${shownotes.id}`.as('s_id'),
        s_title: sql<string>`${shownotes.title}`.as('s_title'),
        s_link: sql<string>`${shownotes.link}`.as('s_link'),
      }
    ).from(episodes).leftJoin(shownotes, eq(episodes.id, shownotes.episodeId))
      .where(or(
        and(
          notLike(episodes.title, `%${query}%`),
          like(shownotes.title, `%${query}%`)),
        and(
          like(episodes.title, `%${query}%`),
          like(shownotes.title, `%${query}%`)))),
    db.selectDistinct(
      {
        e_id: sql<number>`${episodes.id}`.as('e_id'),
        e_title: sql<string>`${episodes.title}`.as('e_title'),
        e_link: sql<string>`${episodes.link}`.as('e_link'),
        e_pubDate: episodes.pubDate,
        s_id: sql<number>`null`.as('s_id'),
        s_title: sql<string>`null`.as('s_title'),
        s_link: sql<string>`null`.as('s_link'),
      }
    ).from(episodes).innerJoin(shownotes, eq(episodes.id, shownotes.episodeId))
      .where(and(
        like(episodes.title, `%${query}%`),
        notLike(shownotes.title, `%${query}%`)))
  )
    .orderBy(desc(episodes.pubDate))
    .all()

  let episodeMap = new Map<number, Episode>();
  result.map(e => {
    if (episodeMap.has(e.e_id)) {
      if (e.s_id === null) {
        // 親がセット済で自分に要素がなかったら入れない
        return
      } else {
        // 親がセット済で自分に要素があったら入れる
        let episode = episodeMap.get(e.e_id)
        const shownote: Shownote = {
          title: e.s_title,
          link: e.s_link,
        }
        episode!.shownotes.push(shownote)
        episodeMap.set(e.e_id, episode!)
      }
    } else {
      // 親がなかったら自分を入れる(要素があってもなくても)
      let episode: Episode = {
        title: e.e_title,
        link: e.e_link,
        pubDate: e.e_pubDate,
        shownotes: []
      }
      const shownote: Shownote = {
        title: e.s_title,
        link: e.s_link,
      }
      episode.shownotes.push(shownote)
      episodeMap.set(e.e_id, episode)
    }

  })

  return c.render(
    <>{Array.from(episodeMap.values()).map(e => {
      const regex = new RegExp(`${query}`, 'gi')
      const marked_title = query === '' ? e.title : e.title.replace(regex, '<mark>$&</mark>')
      const pubDate = DateTime.fromISO(e.pubDate, {zone: 'America/Los_Angeles'}).toFormat('yyyy/LL/dd')
      return (
        <>
          <div class="my-3">
          <h2 class="text-xl text-blue-400 inline-block"><a class="hover:underline" href={e.link} target='_blank'><div dangerouslySetInnerHTML={{ __html: marked_title }} /></a></h2>
          <span class="ml-2 text-gray-400">({pubDate})</span>
          <ul class="list-inside list-disc">{e.shownotes.map(e => {
            if (e.title === null) return
            const marked_title = query === '' ? e.title : e.title.replace(regex, '<mark>$&</mark>')
            return (<li class="whitespace-nowrap mx-3 marker:text-blue-400"><a class="inline-block text-blue-400 hover:underline" href={e.link} target='_blank'><div dangerouslySetInnerHTML={{ __html: marked_title }} /></a></li>)
          })}</ul>
          </div>
        </>
      )
    })}</>
  )
})

export default app
