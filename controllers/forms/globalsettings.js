'use strict';

const changeGlobalSettings = require(__dirname+'/../../models/forms/changeglobalsettings.js')
	, dynamicResponse = require(__dirname+'/../../helpers/dynamic.js')
	, themeHelper = require(__dirname+'/../../helpers/themes.js')
	, config = require(__dirname+'/../../config.js')
	, { checkSchema, lengthBody, numberBody, minmaxBody, numberBodyVariable,
		inArrayBody, arrayInBody, existsBody } = require(__dirname+'/../../helpers/schema.js');

module.exports = async (req, res, next) => {

	const { globalLimits } = config.get;

	const schema = [
		{ result: () => {
			if (req.body.thumb_extension) {
				return /\.[a-z0-9]+/i.test(req.body.thumb_extension);
			}
			return false;
		}, expected: true, error: 'Thumb extension must be like .xxx' },
		{ result: () => {
			if (req.body.other_mime_types) {
				return req.body.other_mime_types
					.split('\n')
					.some(m => {
						return !m.match(/\w+\/\w+/i);
					});
			}
			return false;
		}, expected: false, error: 'Extra mime types must be like type/subtype' },
		{ result: lengthBody(req.body.global_announcement, 0, 10000), expected: false, error: 'Global announcement must not exceed 10000 characters' },
		{ result: lengthBody(req.body.filters, 0, 5000), expected: false, error: 'Filter text cannot exceed 5000 characters' },
		{ result: numberBody(req.body.filter_mode, 0, 2), expected: true, error: 'Filter mode must be a number from 0-2' },
		{ result: numberBody(req.body.ban_duration), expected: true, error: 'Invalid filter auto ban duration' },
		{ result: lengthBody(req.body.allowed_hosts, 0, 10000), expected: false, error: 'Allowed hosts must not exceed 10000 characters' },
		{ result: lengthBody(req.body.country_code_header, 0, 100), expected: false, error: 'Country code header length must not exceed 100 characters' },
		{ result: lengthBody(req.body.ip_header, 0, 100), expected: false, error: 'IP header length must not exceed 100 characters' },
		{ result: lengthBody(req.body.meta_site_name, 0, 100), expected: false, error: 'Meta site name must not exceed 100 characters' },
		{ result: lengthBody(req.body.meta_url, 0, 100), expected: false, error: 'Meta url must not exceed 100 characters' },
		{ result: inArrayBody(req.body.captcha_options_type, ['grid', 'text', 'google', 'hcaptcha']), expected: true, error: 'Invalid captcha options type' },
		{ result: numberBody(req.body.captcha_options_generate_limit, 1), expected: true, error: 'Captcha options generate limit must be a number > 0' },
		{ result: numberBody(req.body.captcha_options_grid_size, 2, 6), expected: true, error: 'Captcha options grid size must be a number from 2-6' },
		{ result: numberBody(req.body.captcha_options_image_size, 50, 500), expected: true, error: 'Captcha options image size must be a number from 50-500' },
		{ result: numberBody(req.body.captcha_options_grid_icon_y_offset, 0, 50), expected: true, error: 'Captcha options icon y offset must be a number from 0-50' },
		{ result: numberBody(req.body.captcha_options_num_distorts_min, 0, 10), expected: true, error: 'Captcha options min distorts must be a number from 0-10' },
		{ result: numberBody(req.body.captcha_options_num_distorts_max, 0, 10), expected: true, error: 'Captcha options max distorts must be a number from 0-10' },
		{ result: minmaxBody(req.body.captcha_options_num_distorts_min, req.body.captcha_options_num_distorts_max), expected: true, error: 'Captcha options distorts min must be less than max' },
		{ result: numberBody(req.body.captcha_options_distortion, 0, 50), expected: true, error: 'Captcha options distortion must be a number from 0-50' },
		{ result: numberBody(req.body.dnsbl_cache_time), expected: true, error: 'Invalid dnsbl cache time' },
		{ result: numberBody(req.body.flood_timers_same_content_same_ip), expected: true, error: 'Invalid flood time same content same ip' },
		{ result: numberBody(req.body.flood_timers_same_content_any_ip), expected: true, error: 'Invalid flood time same contenet any ip' },
		{ result: numberBody(req.body.flood_timers_any_content_same_ip), expected: true, error: 'Invalid flood time any content same ip' },
		{ result: numberBody(req.body.block_bypass_expire_after_uses), expected: true, error: 'Block bypass expire after uses must be a number > 0' },
		{ result: numberBody(req.body.block_bypass_expire_after_time), expected: true, error: 'Invalid block bypass expire after time' },
		{ result: numberBody(req.body.ip_hash_perm_level, -1), expected: true, error: 'Invalid ip hash perm level' },
		{ result: numberBody(req.body.delete_board_perm_level), expected: true, error: 'Invalid delete board perm level' },
		{ result: numberBody(req.body.rate_limit_cost_captcha, 1, 100), expected: true, error: 'Rate limit cost captcha must be a number from 1-100' },
		{ result: numberBody(req.body.rate_limit_cost_board_settings, 1, 100), expected: true, error: 'Rate limit cost board settings must be a number from 1-100' },
		{ result: numberBody(req.body.rate_limit_cost_edit_post, 1, 100), expected: true, error: 'Rate limit cost edit post must be a number from 1-100' },
		{ result: numberBody(req.body.overboard_limit), expected: true, error: 'Invalid overboard limit' },
		{ result: numberBody(req.body.overboard_catalog_limit), expected: true, error: 'Invalid overboard catalog limit' },
		{ result: numberBody(req.body.lock_wait), expected: true, error: 'Invalid lock wait' },
		{ result: numberBody(req.body.prune_modlogs), expected: true, error: 'Prune modlogs must be a number of days' },
		{ result: numberBody(req.body.prune_ips), expected: true, error: 'Prune ips must be a number of days' },
		{ result: lengthBody(req.body.thumb_extension, 1), expected: false, error: 'Thumbnail extension must be at least 1 character' },
		{ result: numberBody(req.body.thumb_size), expected: true, error: 'Invalid thumbnail size' },
		{ result: numberBody(req.body.video_thumb_percentage, 0, 100), expected: true, error: 'Video thumbnail percentage must be a number from 1-100' },
		{ result: numberBody(req.body.default_ban_duration), expected: true, error: 'Invalid default ban duration' },
		{ result: numberBody(req.body.quote_limit), expected: true, error: 'Quote limit must be a number' },
		{ result: numberBody(req.body.preview_replies), expected: true, error: 'Preview replies must be a number' },
		{ result: numberBody(req.body.sticky_preview_replies), expected: true, error: 'Sticky preview replies must be a number' },
		{ result: numberBody(req.body.early_404_fraction), expected: true, error: 'Early 404 fraction must be a number' },
		{ result: numberBody(req.body.early_404_replies), expected: true, error: 'Early 404 fraction must be a number' },
		{ result: numberBody(req.body.max_recent_news), expected: true, error: 'Max recent news must be a number' },
		{ result: lengthBody(req.body.space_file_name_replacement, 1, 1), expected: false, error: 'Space file name replacement must be 1 character' },
		{ result: lengthBody(req.body.highlight_options_language_subset, 0, 10000), expected: false, error: 'Highlight options language subset must not exceed 10000 characters' },
		{ result: lengthBody(req.body.highlight_options_threshold), expected: false, error: 'Highlight options threshold must be a number' },
		{ result: numberBody(req.body.global_limits_thread_limit_min), expected: true, error: 'Global thread limit minimum must be a number' },
		{ result: numberBody(req.body.global_limits_thread_limit_max), expected: true, error: 'Global thread limit maximum must be a number' },
		{ result: minmaxBody(req.body.global_limits_thread_limit_min, req.body.global_limits_thread_limit_max), expected: true, error: 'Global thread limit min must be less than max' },
		{ result: numberBody(req.body.global_limits_reply_limit_min), expected: true, error: 'Global reply limit minimum must be a number' },
		{ result: numberBody(req.body.global_limits_reply_limit_max), expected: true, error: 'Global reply limit maximum must be a number' },
		{ result: minmaxBody(req.body.global_limits_reply_limit_min, req.body.global_limits_reply_limit_max), expected: true, error: 'Global reply limit min must be less than max' },
		{ result: numberBody(req.body.global_limits_bump_limit_min), expected: true, error: 'Global bump limit minimum must be a number' },
		{ result: numberBody(req.body.global_limits_bump_limit_max), expected: true, error: 'Global bump limit minimum must be a number' },
		{ result: minmaxBody(req.body.global_limits_bump_limit_min, req.body.global_limits_bump_limit_max), expected: true, error: 'Global bump limit min must be less than max' },
		{ result: numberBody(req.body.global_limits_post_files_max), expected: true, error: 'Post files max must be a number' },
		{ result: numberBody(req.body.global_limits_post_files_size_max), expected: true, error: 'Post files size must be a number' },
		{ result: numberBody(req.body.global_limits_banner_files_size_max), expected: true, error: 'Banner files size must be a number' },
		{ result: numberBody(req.body.global_limits_banner_files_width, 1), expected: true, error: 'Banner files height must be a number > 0' },
		{ result: numberBody(req.body.global_limits_banner_files_height, 1), expected: true, error: 'Banner files width must be a number > 0' },
		{ result: numberBody(req.body.global_limits_banner_files_max), expected: true, error: 'Banner files max must be a number' },
		{ result: numberBody(req.body.global_limits_banner_files_total), expected: true, error: 'Banner files total must be a number' },
		{ result: numberBody(req.body.global_limits_field_length_name), expected: true, error: 'Global limit name field length must be a number' },
		{ result: numberBody(req.body.global_limits_field_length_email), expected: true, error: 'Global limit email field length must be a number' },
		{ result: numberBody(req.body.global_limits_field_length_subject), expected: true, error: 'Global limit subject field length must be a number' },
		{ result: numberBody(req.body.global_limits_field_length_postpassword), expected: true, error: 'Global limit postpassword field length must be a number' },
		{ result: numberBody(req.body.global_limits_field_length_message), expected: true, error: 'Global limit message field length must be a number' },
		{ result: numberBody(req.body.global_limits_field_length_report_reason), expected: true, error: 'Global limit report reason field length must be a number' },
		{ result: numberBody(req.body.global_limits_field_length_ban_reason), expected: true, error: 'Global limit ban reason field length must be a number' },
		{ result: numberBody(req.body.global_limits_field_length_log_message), expected: true, error: 'Global limit log message field length must be a number' },
		{ result: numberBody(req.body.global_limits_field_length_uri), expected: true, error: 'Global limit board uri field length must be a number' },
		{ result: numberBody(req.body.global_limits_field_length_boardname), expected: true, error: 'Global limit board name field length must be a number' },
		{ result: numberBody(req.body.global_limits_field_length_description), expected: true, error: 'Global limit board description field length must be a number' },
		{ result: numberBody(req.body.global_limits_multi_input_posts_anon), expected: true, error: 'Multi input anon limit must be a number' },
		{ result: numberBody(req.body.global_limits_multi_input_posts_staff), expected: true, error: 'Multi input staff limit must be a number' },
		{ result: numberBody(req.body.global_limits_custom_css_max), expected: true, error: 'Custom css max must be a number' },
		{ result: lengthBody(req.body.global_limits_custom_css_filters, 0, 10000), expected: false, error: 'Custom css filters must not exceed 10000 characters' },
		{ result: numberBody(req.body.global_limits_custom_pages_max), expected: true, error: 'Custom pages max must be a number' },
		{ result: numberBody(req.body.global_limits_custom_pages_max_length), expected: true, error: 'Custom pages max length must be a number' },
		{ result: inArrayBody(req.body.board_defaults_theme, themeHelper.themes), expected: true, error: 'Invalid board default theme' },
		{ result: inArrayBody(req.body.board_defaults_code_theme, themeHelper.codeThemes), expected: true, error: 'Invalid board default code theme' },
		{ result: numberBody(req.body.board_defaults_lock_mode, 0, 2), expected: true, error: 'Board default lock mode must be a number from 0-2' },
		{ result: numberBody(req.body.board_defaults_file_r9k_mode, 0, 2), expected: true, error: 'Board default file r9k mode must be a number from 0-2' },
		{ result: numberBody(req.body.board_defaults_message_r9k_mode, 0, 2), expected: true, error: 'Board default message r9k mode must be a number from 0-2' },
		{ result: numberBody(req.body.board_defaults_captcha_mode, 0, 2), expected: true, error: 'Board default captcha mode must be a number from 0-2' },
		{ result: numberBody(req.body.board_defaults_tph_trigger), expected: true, error: 'Board default tph trigger must be a number' },
		{ result: numberBody(req.body.board_defaults_pph_trigger), expected: true, error: 'Board default pph trigger must be a number' },
		{ result: numberBody(req.body.board_defaults_pph_trigger_action, 0, 4), expected: true, error: 'Board default pph trigger action must be a number from 0-4' },
		{ result: numberBody(req.body.board_defaults_tph_trigger_action, 0, 4), expected: true, error: 'Board default tph trigger action must be a number from 0-4' },
		{ result: numberBody(req.body.board_defaults_captcha_reset, 0, 2), expected: true, error: 'Board defaults captcha reset must be a number from 0-2' },
		{ result: numberBody(req.body.board_defaults_lock_reset, 0, 2), expected: true, error: 'Board defaults lock reset must be a number from 0-2' },
		{ result: numberBodyVariable(req.body.board_defaults_reply_limit, req.body.global_limits_reply_limit_min, globalLimits.replyLimit.min, req.body.global_limits_reply_limit_max, globalLimits.replyLimit.max), expected: true, error: `Board defaults reply limit must be within global limits` },
		{ result: numberBodyVariable(req.body.board_defaults_thread_limit, req.body.global_limits_thread_limit_min, globalLimits.threadLimit.min, req.body.global_limits_thread_limit_max, globalLimits.threadLimit.max), expected: true, error: `Board defaults thread limit must be within global limits` },
		{ result: numberBodyVariable(req.body.board_defaults_bump_limit, req.body.global_limits_bump_limit_min, globalLimits.bumpLimit.min, req.body.global_limits_bump_limit_max, globalLimits.bumpLimit.max), expected: true, error: `Board defaults bump limit must be within global limits` },
		{ result: numberBodyVariable(req.body.board_defaults_max_files, 0, 0, req.body.global_limits_post_files_max, globalLimits.postFiles.max), expected: true, error: `Board defaults max files must be within global limits` },
		{ result: numberBodyVariable(req.body.board_defaults_max_thread_message_length, 0, 0, req.body.global_limits_field_length_message, globalLimits.fieldLength.message), expected: true, error: `Board defaults max thread message length must be within global limits` },
		{ result: numberBodyVariable(req.body.board_defaults_max_reply_message_length, 0, 0, req.body.global_limits_field_length_message, globalLimits.fieldLength.message), expected: true, error: `Board defaults max reply message length must be within global limits` },
		{ result: numberBody(req.body.board_defaults_min_thread_message_length), expected: true, error: 'Board defaults min thread message length must be a number' },
		{ result: numberBody(req.body.board_defaults_min_reply_message_length), expected: true, error: 'Board defaults min reply message length must be a number' },
		{ result: minmaxBody(req.body.board_defaults_min_thread_message_length, req.body.board_defaults_max_thread_message_length), expected: true, error: 'Board defaults thread message length min must be less than max' },
		{ result: minmaxBody(req.body.board_defaults_min_reply_message_length, req.body.board_defaults_max_reply_message_length), expected: true, error: 'Board defaults reply message length min must be less than max' },
		{ result: numberBody(req.body.board_defaults_filter_mode, 0, 2), expected: true, error: 'Board defaults filter most must be a number from 0-2' },
		{ result: numberBody(req.body.board_defaults_filter_ban_duration), expected: true, error: 'Board defaults filter ban duration must be a number' },
		{ result: lengthBody(req.body.webring_following, 0, 10000), expected: false, error: 'Webring following list must not exceed 10000 characters' },
		{ result: lengthBody(req.body.webring_blacklist, 0, 10000), expected: false, error: 'Webring blacklist must not exceed 10000 characters' },
		{ result: lengthBody(req.body.webring_logos, 0, 10000), expected: false, error: 'Webring logos list must not exceed 10000 characters' },
	];

	const errors = await checkSchema(schema);

	if (errors.length > 0) {
		return dynamicResponse(req, res, 400, 'message', {
			'title': 'Bad request',
			'errors': errors,
			'redirect': '/globalmanage/settings.html'
		});
	}

	try {
		await changeGlobalSettings(req, res, next);
	} catch (err) {
		return next(err);
	}

}
