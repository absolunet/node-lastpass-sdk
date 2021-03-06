//--------------------------------------------------------
//-- LastPass
//--------------------------------------------------------
'use strict';

const { execSync } = require('child_process');
const dargs        = require('dargs');
const ow           = require('ow');
const { terminal } = require('@absolunet/terminal');


const MULTIPLE_MATCHES = 'Multiple matches found.';

// Logged in as user@example.com.
const REGEXP_LOGGED_IN = /^Logged in as (?<username>.*)\.$/u;

// 2019-01-02 03:04 lorem-ipsum [id: 1234567890] [username: john@example.com]
const REGEXP_SHOW_LONG = /^(?<date>\d{4}-\d{2}-\d{2} \d{2}:\d{2})? (?<name>.+) (?<fullid>\[id: (?<id>.+)\]) (?<fullusername>\[username: (?<username>.+)?\])$/u;

// lorem-ipsum [id: 1234567890]
const REGEXP_NAMEID = /^(?<name>.+) (?<fullid>\[id: (?<id>.+)\])$/u;

// Field:Value
const REGEXP_NOTE_FIELD = /^(?<field>.+):(?<value>.+)?$/u;

// Error: Could not find specified account(s).
const REGEXP_NOT_FOUND = /^Error: Could not find specified account\(s\)\.\n$/u;


const call = (input = '', parameters = {}, allowed = {}, aliases = {}, prefix = '') => {
	const command = `${prefix ? `${prefix.trim()} ` : ''}lpass ${input} ${dargs(parameters, { ignoreFalse: true, includes: allowed.concat(Object.keys(aliases)), aliases: aliases }).join(' ')}`;

	try {
		return {
			success: true,
			raw: terminal.runAndRead(command).split('\n').filter(Boolean).join('\n')
		};
	} catch (error) {

		// Some error messages can only be trapped when stderr is set to 'pipe' which breaks CLI prompt for answers...
		return {
			success: false,
			message: (error.stderr || error.stdout || error.toString()).split('\n').filter(Boolean).join('\n')
		};
	}
};


const extractValues = (raw, pattern) => {
	const { groups = {} } = raw.match(pattern) || {};

	return groups;
};


const parseMultipleMatches = (lines) => {
	const matches = [];
	lines.forEach((line) => {
		const { name, id } = extractValues(line, REGEXP_NAMEID);

		if (name && id) {
			matches.push({ name, id });
		}
	});

	return matches;
};






/* eslint-disable require-await */
class LastPass {

	// lpass login [--trust] [--plaintext-key [--force, -f]] [--color=auto|never|always] USERNAME
	async login(username, parameters = {}) {
		ow(username,   ow.string.nonEmpty);
		ow(parameters, ow.object);

		const { password } = parameters;
		const prefix       = password ? `echo "${password}" | LPASS_DISABLE_PINENTRY=1` : '';

		delete parameters.password;

		return call(`login "${username}"`, parameters, ['trust', 'plaintextKey', 'force', 'color'], undefined, prefix);
	}


	// lpass logout [--force, -f] [--color=auto|never|always]
	async logout(parameters = {}) {
		ow(parameters, ow.object);

		return call(`logout`, parameters, ['force', 'color']);
	}


	// lpass passwd
	async passwd() {
		return call(`passwd`);
	}


	// lpass show [--sync=auto|now|no] [--clip, -c] [--expand-multi, -x] [--all|--username|--password|--url|--notes|--field=FIELD|--id|--name] [--basic-regexp, -G|--fixed-strings, -F] [--color=auto|never|always] {NAME|UNIQUEID}*
	async show(nameOrUniqueId = [], parameters = {}) {
		ow(nameOrUniqueId, ow.any(ow.string.nonEmpty, ow.array));
		ow(parameters,     ow.object);

		const entries = typeof nameOrUniqueId === 'string' ? [nameOrUniqueId] : nameOrUniqueId;

		// Is a single field query
		const selectedFields = [];
		['username', 'password', 'url', 'notes', 'id', 'name'].forEach((selected) => {
			if (parameters[selected] === true) {
				selectedFields.push(selected);
			}
		});

		if (parameters.field) {
			selectedFields.push(parameters.field);
		}

		if (selectedFields.length > 1) {
			return {
				success: false,
				message: 'Too many selected fields.'
			};
		}

		if (selectedFields.length === 1 && entries.length > 1) {
			return {
				success: false,
				message: 'Selected field and multiple entries are not supported.'
			};
		}

		parameters.json = selectedFields.length === 0;


		// Call
		const results = call(`show "${entries.join('" "')}"`, parameters, ['sync', 'clip', 'expandMulti', 'all', 'username', 'password', 'url', 'notes', 'field', 'id', 'name', 'basicRegexp', 'fixedStrings', 'color', 'json']);

		if (results.success) {
			const lines     = results.raw.split('\n');
			const firstLine = lines.shift();

			// Multiple matches
			if (firstLine === MULTIPLE_MATCHES) {
				const matches = parseMultipleMatches(lines);

				return {
					success: false,
					message: MULTIPLE_MATCHES,
					data:    matches,
					raw:     results.raw
				};
			}

			let data;

			// JSON output
			if (parameters.json) {

				data = JSON.parse(results.raw);
				data.forEach((entry) => {
					entry.last_modified_gmt = new Date(Number(entry.last_modified_gmt) * 1000);  // eslint-disable-line camelcase
					entry.last_touch        = new Date(Number(entry.last_touch) * 1000);         // eslint-disable-line camelcase

					// Try to figure out if extra fields are here
					if (entry.note.startsWith('NoteType:')) {
						let latestField;

						entry.note.split('\n').forEach((noteField) => {

							// Might break if field contains ':'
							const { field, value } = extractValues(noteField, REGEXP_NOTE_FIELD);
							if (field) {
								latestField = field;
								entry[field] = value;
							} else {
								entry[latestField] += `\n${noteField}`;
							}
						});

						delete entry.note;
					}
				});

			// Selected field
			} else {
				data = [{ [selectedFields[0]]: results.raw }];
			}

			return {
				success: true,
				data:    data,
				raw:     results.raw
			};
		}

		return results;
	}


	// lpass ls [--sync=auto|now|no] [--long, -l] [-m] [-u] [--color=auto|never|always] [GROUP]
	async ls(group = '', parameters = {}) {
		ow(group,      ow.string);
		ow(parameters, ow.object);

		const results = call(`ls "${group}"`, parameters, ['sync', 'long', 'color'], { lastUse: 'u' });

		if (results.success) {
			const data = [];

			results.raw.split('\n').forEach((entry) => {

				if (parameters.long) {
					const { date, name, id, username } = extractValues(entry, REGEXP_SHOW_LONG);

					const dateKey   = `last_${parameters.lastUse ? 'touch' : 'modified_gmt'}`;
					const dateValue =  date ? new Date(parameters.lastUse ? date : `${date.replace(' ', 'T')}:00.000Z`) : undefined;

					data.push({
						name:     name,
						id:       id,
						username: username,
						[dateKey]: dateValue
					});

				} else {
					const { name, id } = extractValues(entry, REGEXP_NAMEID);
					data.push({ name, id });
				}
			});

			return {
				success: true,
				data:    data,
				raw:     results.raw
			};
		}

		return results;
	}


	// lpass mv [--sync=auto|now|no] [--color=auto|never|always] {UNIQUENAME|UNIQUEID} GROUP
	async mv(uniqueNameOrUniqueId, group, parameters = {}) {
		ow(uniqueNameOrUniqueId, ow.string.nonEmpty);
		ow(group,                ow.string.nonEmpty);
		ow(parameters,           ow.object);

		return call(`mv "${uniqueNameOrUniqueId}" "${group}"`, parameters, ['sync', 'color']);
	}


	// lpass add [--sync=auto|now|no] [--non-interactive] {--name|--username, -u|--password, -p|--url|--notes|--field=FIELD|--note-type=NOTETYPE} [--color=auto|never|always] {NAME|UNIQUEID}
	async add(nameOrUniqueId, parameters = {}) {
		ow(nameOrUniqueId, ow.string.nonEmpty);
		ow(parameters,     ow.object);

		return call(`add "${nameOrUniqueId}"`, parameters, ['sync', 'nonInteractive', 'name', 'username', 'password', 'url', 'notes', 'field', 'noteType', 'color']);
	}


	// lpass edit [--sync=auto|now|no] [--non-interactive] {--name|--username, -u|--password, -p|--url|--notes|--field=FIELD} [--color=auto|never|always] {NAME|UNIQUEID}
	async edit(nameOrUniqueId, parameters = {}) {
		ow(nameOrUniqueId, ow.string.nonEmpty);
		ow(parameters,     ow.object);

		return call(`edit "${nameOrUniqueId}"`, parameters, ['sync', 'nonInteractive', 'name', 'username', 'password', 'url', 'notes', 'field', 'color']);
	}


	// lpass generate [--sync=auto|now|no] [--clip, -c] [--username=USERNAME] [--url=URL] [--no-symbols] [--color=auto|never|always] {NAME|UNIQUEID} LENGTH
	async generate(nameOrUniqueId, length = 32, parameters = {}) {
		ow(nameOrUniqueId, ow.string.nonEmpty);
		ow(length,         ow.number.integer.inRange(4, 100));
		ow(parameters,     ow.object);

		const results = call(`generate "${nameOrUniqueId}" ${length}`, parameters, ['sync', 'clip', 'username', 'url', 'noSymbols', 'color']);

		if (results.success) {
			return {
				success: true,
				data:    { password: results.raw },
				raw:     results.raw
			};
		}

		return results;
	}


	// lpass duplicate [--sync=auto|now|no] [--color=auto|never|always] {UNIQUENAME|UNIQUEID}
	async duplicate(uniqueNameOrUniqueId, parameters = {}) {
		ow(uniqueNameOrUniqueId, ow.string.nonEmpty);
		ow(parameters,           ow.object);

		return call(`duplicate "${uniqueNameOrUniqueId}"`, parameters, ['sync', 'color']);
	}


	// lpass rm [--sync=auto|now|no] [--color=auto|never|always] {UNIQUENAME|UNIQUEID}
	async rm(uniqueNameOrUniqueId, parameters = {}) {
		ow(uniqueNameOrUniqueId, ow.string.nonEmpty);
		ow(parameters,           ow.object);

		return call(`rm "${uniqueNameOrUniqueId}"`, parameters, ['sync', 'color']);
	}


	// lpass status [--quiet, -q] [--color=auto|never|always]
	async status(parameters = {}) {
		ow(parameters, ow.object);

		const results = call(`status`, parameters, ['quiet', 'color']);

		if (results.success) {
			const { username } = extractValues(results.raw, REGEXP_LOGGED_IN);

			if (username) {
				return {
					success: true,
					data:    { username },
					raw:     results.raw
				};
			}
		}

		return results;
	}


	// lpass sync [--background, -b] [--color=auto|never|always]
	async sync(parameters = {}) {
		ow(parameters, ow.object);

		return call(`sync`, parameters, ['background', 'color']);
	}


	// lpass import [--sync=auto|now|no] [FILENAME]
	async import(filename, parameters = {}) {
		ow(filename,   ow.string.nonEmpty);
		ow(parameters, ow.object);

		return call(`import "${filename}"`, parameters, ['sync']);
	}


	// lpass export [--sync=auto|now|no] [--color=auto|never|always]
	async export(parameters = {}) {
		ow(parameters, ow.object);

		return call(`export`, parameters, ['sync', 'color']);
	}


	// lpass share userls SHARE
	async shareUserls(share) {
		ow(share, ow.string.nonEmpty);

		return call(`share userls "${share}"`);
	}


	// lpass share useradd [--read-only=[true|false]] [--hidden=[true|false]] [--admin=[true|false]] SHARE USERNAME
	async shareUseradd(share, username, parameters = {}) {
		ow(share,      ow.string.nonEmpty);
		ow(username,   ow.string.nonEmpty);
		ow(parameters, ow.object);

		return call(`share useradd "${share}" "${username}"`, parameters, ['readOnly', 'hidden', 'admin']);
	}


	// lpass share usermod [--read-only=[true|false]] [--hidden=[true|false]] [--admin=[true|false]] SHARE USERNAME
	async shareUsermod(share, username, parameters = {}) {
		ow(share,      ow.string.nonEmpty);
		ow(username,   ow.string.nonEmpty);
		ow(parameters, ow.object);

		return call(`share usermod "${share}" "${username}"`, parameters, ['readOnly', 'hidden', 'admin']);
	}


	// lpass share userdel SHARE USERNAME
	async shareUserdel(share, username) {
		ow(share,    ow.string.nonEmpty);
		ow(username, ow.string.nonEmpty);

		return call(`share userdel "${share}" "${username}"`);
	}


	// lpass share create SHARE
	async shareCreate(share) {
		ow(share, ow.string.nonEmpty);

		return call(`share create "${share}"`);
	}


	// lpass share rm SHARE
	async shareRm(share) {
		ow(share, ow.string.nonEmpty);

		return call(`share rm "${share}"`);
	}


	// lpass share limit [--deny|--allow] [--add|--rm|--clear] SHARE USERNAME [sites]
	async shareLimit(share, username, sites = [], parameters = {}) {
		ow(share,      ow.string.nonEmpty);
		ow(username,   ow.string.nonEmpty);
		ow(sites,      ow.any(ow.string.nonEmpty, ow.array));
		ow(parameters, ow.object);

		const list = typeof nameOrUniqueId === 'string' ? [sites] : sites;

		return call(`share limit "${share}" "${username}" ${list ? `"${list.join('" "')}"` : ''}`, parameters, ['deny', 'allow', 'add', 'rm', 'clear']);
	}






	// Scan for entries via 'lpass show' - Must be logged in because it traps password prompt
	async scan(searchInput, { basicRegexp = false, fixedStrings = false } = {}) {
		ow(searchInput,  ow.any(ow.string.nonEmpty, ow.array));
		ow(basicRegexp,  ow.boolean);
		ow(fixedStrings, ow.boolean);

		const searchTerms = typeof searchInput === 'string' ? [searchInput] : searchInput;
		const cmd = `lpass show "${searchTerms.join('" "')}" ${dargs({ basicRegexp, fixedStrings }, { ignoreFalse: true }).join(' ')}`;

		try {
			const result = execSync(cmd, { stdio: 'pipe', encoding: 'utf8' });

			return parseMultipleMatches(result.split('\n'));

		} catch (error) {
			if (REGEXP_NOT_FOUND.test(error.stderr)) {
				return [];
			}

			throw new Error(error);
		}
	}

}


module.exports = new LastPass();
