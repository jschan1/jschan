const Busboy = require('busboy');
const UploadTimer = require('./uploadtimer');
const fileFactory = require('./fileFactory');
const memHandler = require('./memHandler');
const tempFileHandler = require('./tempFileHandler');
const processNested = require('./processNested');
const {
	isFunc,
	debugLog,
	buildFields,
	buildOptions,
	parseFileName
} = require('./utilities');

const waitFlushProperty = Symbol('wait flush property symbol');

/**
 * Processes multipart request
 * Builds a req.body object for fields
 * Builds a req.files object for files
 * @param	{Object}	 options expressFileupload and Busboy options
 * @param	{Object}	 req		 Express request object
 * @param	{Object}	 res		 Express response object
 * @param	{Function} next		Express next method
 * @return {void}
 */
module.exports = (options, req, res, next) => {

	res.locals.alreadyNext = false;
	res.locals.filesDone = new Promise((resolve, reject) => {

		const finish = (err) => {
			if (err) {
				reject();
			} else {
				resolve();
			}
			cleanAll();
			if (!res.locals.alreadyNext) {
				return next(err);
			}
		};

		req.files = null;
		let totalSize = 0;
		debugLog(options, `Request with content-length header ${req.headers['content-length']}`);
		if (req.headers['content-length'] > options.limits.totalSize) {
			return options.limitHandler(req, res, next);
		}
		const cleanups = [];
		const cleanAll = () => {
			cleanups.forEach(cleanup => {
				cleanup();
			});
			req.off('aborted', cleanAll);
		}
		res.locals.cleanAll = cleanAll;
		req.on('aborted', cleanAll);

		// Build busboy options and init busboy instance.
		const busboyOptions = buildOptions(options, { headers: req.headers });
		const busboy = new Busboy(busboyOptions);

		// Close connection with specified reason and http code, default: 400 Bad Request.
		const closeConnection = (code, reason) => {
			req.unpipe(busboy);
			res.writeHead(code || 400, { Connection: 'close' });
			res.end(reason || 'Bad Request');
		};

		// Build multipart req.body fields
		busboy.on('field', (field, val) => {
			req.body = buildFields(req.body, field, val)
			if (field === 'captcha') {
				debugLog(options, `Got captcha field, checking. Finishing file uploads async in background`);
			}
		});

		// Build req.files fields
		busboy.on('file', (field, file, name, encoding, mime) => {

			//Go next early, do files in background. relying on files being uploaded after fields in multipart data
				if (!res.locals.alreadyNext) {
					res.locals.alreadyNext = true;
					next();
				}


			// Parse file name(cutting huge names, decoding, etc..).
			const filename = parseFileName(options, name);
			// Define methods and handlers for upload process.
			const {
				dataHandler,
				getFilePath,
				getFileSize,
				getHash,
				complete,
				cleanup,
				getWritePromise
			} = options.useTempFiles
				? tempFileHandler(options, field, filename) // Upload into temporary file.
				: memHandler(options, field, filename);		 // Upload into RAM.

			cleanups.push(cleanup);

			file.on('limit', () => {
				debugLog(options, `Size limit reached for ${field}->${filename}, bytes:${getFileSize()}`);
				// Run a user defined limit handler if it has been set.
				if (isFunc(options.limitHandler)) {
					req.unpipe(busboy);
					cleanAll();
					return options.limitHandler(req, res, next);
				}
				// Close connection with 413 code and do cleanup if abortOnLimit set(default: false).
				if (options.abortOnLimit) {
					debugLog(options, `Aborting upload because of size limit ${field}->${filename}.`);
					closeConnection(413, options.responseOnLimit);
					cleanAll();
				}
			});

			file.on('data', (data) => {
			totalSize+=data.length;
			if (totalSize > options.limits.totalSize) {
				debugLog(options, `Aborting upload because of size limit.`);
				req.unpipe(busboy);
				cleanAll();
				return options.limitHandler(req, res, next);
			}
			dataHandler(data);
		});

			file.on('end', () => {
				const size = getFileSize();
				// Debug logging for a new file upload.
				debugLog(options, `Upload finished ${field}->${filename}, bytes:${size}`);
				// Add file instance to the req.files
				// Empty name and zero size indicates empty file field in the posted form.
				if (!name && size === 0) {
					return debugLog(options, `Don't add file instance if original name and size are empty`);
				}
				req.files = buildFields(req.files, field, fileFactory({
					buffer: complete(),
					name: filename,
					tempFilePath: getFilePath(),
					hash: getHash(),
					size: getFileSize(),
					encoding,
					truncated: file.truncated,
					mimetype: mime
				}, options));
				if (!req[waitFlushProperty]) {
					req[waitFlushProperty] = [];
				}
				req[waitFlushProperty].push(getWritePromise());
			});

			file.on('error', (err) => {
				debugLog(options, `Error ${field}->${filename}, bytes:${getFileSize()}, error:${err}`);
				cleanAll();
				finish();
			});

			// Debug logging for a new file upload.
			debugLog(options, `New upload started ${field}->${filename}, bytes:${getFileSize()}`);
		});

		busboy.on('filesLimit', () => {
			if (isFunc(options.numFilesLimitHandler)){
				cleanAll();
				return options.numFilesLimitHandler(req, res, next);
			}
		});

		busboy.on('finish', () => {
			debugLog(options, `Busboy finished parsing request.`);
			if (options.parseNested) {
				req.body = processNested(req.body);
				req.files = processNested(req.files);
			}
			req.off('aborted', cleanAll);
			if (!req[waitFlushProperty]) return finish();
			Promise.all(req[waitFlushProperty])
			.then(() => {
				delete req[waitFlushProperty];
				finish();
			}).catch(err => {
				delete req[waitFlushProperty];
				debugLog(options, `Error while waiting files flush: ${err}`);
				finish(err);
			});
		});

		busboy.on('error', (err) => {
			debugLog(options, `Busboy error`);
			finish(err);
		});

		req.pipe(busboy);

	});

};
