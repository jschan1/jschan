'use strict';

const Mongo = require(__dirname+'/../db/db.js')
	, msTime = require(__dirname+'/mstime.js')
	, Posts = require(__dirname+'/../db/posts.js')
	, Boards = require(__dirname+'/../db/boards.js')
	, uploadDirectory = require(__dirname+'/files/uploadDirectory.js')
	, render = require(__dirname+'/render.js');

function addBacklinks(thread, preview) { //preview means this is not the full thread
	const postMap = new Map()
	postMap.set(thread.postId, thread)
	for (let i = 0; i < thread.replies.length; i++) {
		const reply = thread.replies[i];
		postMap.set(reply.postId, reply);
	}
	for (let i = 0; i < thread.replies.length; i++) {
		const reply = thread.replies[i];
		if (!reply.quotes) continue;
		for (let j = 0; j < reply.quotes.length; j++) {
			const quote = reply.quotes[j];
			if (postMap.has(quote)) {
				const post = postMap.get(quote)
				if (!post.backlinks) {
					post.backlinks = [];
				}
				post.backlinks.push(reply.postId);
			} else if (!preview) {
				/*
					quote was valid on post creation, but points to postID that has been deleted
					or possibly removed from cyclical thread (whenever i implement those)
					could re-markdown the post here to remove the quotes (or convert to greentext)
				*/
			}
		}
	}
}

module.exports = {

	buildBanners: async(board) => {
console.log('building banners', `${board._id}/banners.html`);
		return render(`${board._id}/banners.html`, 'banners.pug', {
			board: board,
		});
	},

	buildCatalog: async (board) => {
console.log('building catalog', `${board._id}/catalog.html`);
		if (!board._id) {
			board = await Boards.findOne(board);
		}
		const threads = await Posts.getCatalog(board._id);
		return render(`${board._id}/catalog.html`, 'catalog.pug', {
			board,
			threads,
		});
	},

	buildThread: async (threadId, board) => {
console.log('building thread', `${board._id || board}/thread/${threadId}.html`);
		if (!board._id) {
			board = await Boards.findOne(board);
		}
		const thread = await Posts.getThread(board._id, threadId)
		if (!thread) {
			return; //this thread may have been an OP that was deleted
		}

		addBacklinks(thread, false);

		return render(`${board._id}/thread/${threadId}.html`, 'thread.pug', {
			board,
			thread,
		});
	},

	buildBoard: async (board, page, maxPage=null) => {
console.log('building board page', `${board._id}/${page === 1 ? 'index' : page}.html`);
		const threads = await Posts.getRecent(board._id, page);
		if (maxPage == null) {
			maxPage = Math.min(Math.ceil((await Posts.getPages(board._id)) / 10), Math.ceil(board.settings.threadLimit/10));
		}
		for (let k = 0; k < threads.length; k++) {
			const thread = threads[k];
			addBacklinks(thread, true);
		}

		return render(`${board._id}/${page === 1 ? 'index' : page}.html`, 'board.pug', {
			board,
			threads,
			maxPage,
			page,
		});
	},

	//building multiple pages (for rebuilds)
	buildBoardMultiple: async (board, startpage=1, endpage) => {
		const maxPage = Math.min(Math.ceil((await Posts.getPages(board._id)) / 10), Math.ceil(board.settings.threadLimit/10));
		if (endpage === 0) {
			//deleted only/all posts, so only 1 page will remain
			endpage = 1;
		} else if (maxPage < endpage) {
			//else just build up to the max page if it is greater than input page number
			endpage = maxPage
		}
		const difference = endpage-startpage + 1; //+1 because for single pagemust be > 0
		const threads = await Posts.getRecent(board._id, startpage, difference*Math.ceil(board.settings.threadLimit/10));
		for (let k = 0; k < threads.length; k++) {
			const thread = threads[k];
			addBacklinks(thread, true);
		}

		const buildArray = [];
console.log('multi building board pages', `${board._id}/ ${startpage === 1 ? 'index' : startpage} -> ${endpage === 1 ? 'index' : endpage} .html`);
		for (let i = startpage; i <= endpage; i++) {
			let spliceStart = (i-1)*10;
			if (spliceStart > 0) {
				spliceStart = spliceStart - 1;
			}
			buildArray.push(
				render(`${board._id}/${i === 1 ? 'index' : i}.html`, 'board.pug', {
					board,
					threads: threads.splice(0,10),
					maxPage,
					page: i,
				})
			);
		}
		return Promise.all(buildArray);
	},

	buildHomepage: async () => {
console.log('building homepage /index.html');
		const boards = await Boards.find();
		const yesterday = Math.floor((Date.now() - msTime.hour)/1000);
		const yesterdayObjectId = Mongo.ObjectId.createFromTime(yesterday);
		const pph = await Posts.db.aggregate([
			{
				'$match': {
					'_id': {
						'$gt': yesterdayObjectId
					}
				}
			},
			{
				'$group': {
					'_id': '$board',
					'pph': { '$sum': 1 },
				}
			},
		]).toArray().then(res => {
			return res.reduce((acc, item) => {
				acc[item._id] = item.pph;
				return acc;
			}, {});
		});
		for (let i = 0; i < boards.length; i++) {
			const board = boards[i];
			board.pph = pph[board._id] || 0;
		}
		return render('index.html', 'home.pug', {
			boards,
		});
	},

	buildChangePassword: () => {
		return render('changepassword.html', 'changepassword.pug');
	},

	buildRegister: () => {
		return render('register.html', 'register.pug');
	},

	buildCaptcha: () => {
		return render('captcha.html', 'captcha.pug');
	},

}
