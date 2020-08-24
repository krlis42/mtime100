const fs = require('fs')

const request = require('syncrequest')
const cheerio = require('cheerio')

const log = console.log.bind(console)

class Movie {
    constructor() {
        // 分别是电影名/评分/引言/排名/封面图片链接/评价人数
        this.name = ''
        this.score = 0
        this.quote = ''
        this.ranking = 0
        this.coverUrl = ''
        this.evaNums = 0
    }
}

const movieFromDiv = (div) => {
    let e = cheerio.load(div)

    let movie = new Movie()

    movie.name = e('.mov_pic').find('a').attr('title')
    movie.score = Number(e('.total').text() + e('.total2').text())
    movie.quote = e('.mt3').text()

    let number = e('.number')
    movie.ranking = Number(number.find('em').text())

    movie.coverUrl = e('.img_box').attr('src')

    let star = e('.mov_point')
    movie.evaNums = Number(star.find('p').text().slice(1, -5))

    return movie
}

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
    }
}

const cachedUrl = (url) => {
    let dir = 'cached_html'
    ensureDir(dir)
    let cacheFile = dir + '/' + url.split('top100/')[1] + '.html'
    let exists = fs.existsSync(cacheFile)
    if (exists) {
        let data = fs.readFileSync(cacheFile)
        return data
    } else {
        let r = request.get.sync(url)
        let body = r.body
        fs.writeFileSync(cacheFile, body)
        return body
    }
}

const moviesFromUrl = (url) => {
    let body = cachedUrl(url)
    let e = cheerio.load(body)
    let movieDivs = e('.top_list').find('li')
    let movies = []
    for (let i = 0; i < movieDivs.length; i++) {
        let div = movieDivs[i]
        let m = movieFromDiv(div)
        movies.push(m)
    }
    return movies
}

const saveMovie = (movies) => {
    let s = JSON.stringify(movies, null, 2)
    let path = 'mtime.json'
    fs.writeFileSync(path, s)
}

const downloadCovers = (movies) => {
    let dir = 'cover'
    ensureDir(dir)

    for (let i = 0; i < movies.length; i++) {
        let m = movies[i]
        let url = m.coverUrl
        let path = dir + '/' + String(m.ranking) + '_' + m.name + '.jpg'
        request.sync(url, {
            pipe: path,
        })
    }
}

const __main = () => {
    let movies = []
    console.time('mtime')
    for (let i = 1; i <= 10; i++) {
        if (i === 1) {
            let url = 'https://www.mtime.com/top/movie/top100/'
            let moviesInPage = moviesFromUrl(url)
            movies = [...movies, ...moviesInPage]
        } else {
            let page = i
            let url = `https://www.mtime.com/top/movie/top100/index-${page}.html`
            let moviesInPage = moviesFromUrl(url)
            movies = [...movies, ...moviesInPage]
        }
    }
    log('movies', movies.length)
    saveMovie(movies)
    downloadCovers(movies)
    console.timeEnd('mtime')
    log('抓取成功, 数据已经写入到 mtime.json 中')
}
__main()
