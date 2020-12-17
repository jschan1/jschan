'use strict';

module.exports = async (req, res) => {

	if (res.locals.cleanAll) {
		res.locals.cleanAll();
	}

}
