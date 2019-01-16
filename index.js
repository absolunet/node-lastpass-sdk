//--------------------------------------------------------
//-- LastPass
//--------------------------------------------------------
'use strict';

const dargs    = require('dargs');
const ow       = require('ow');
const terminal = require('@absolunet/terminal');


const MULTIPLE_MATCHES = 'Multiple matches found.';

// Logged in as user@example.com.
const REGEXP_LOGGED_IN = /^Logged in as (.*)\.$/u;

// 2019-01-02 03:04 lorem-ipsum [id: 1234567890] [username: john@example.com]
const REGEXP_SHOW_LONG = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})? (.+) (\[id: (.+)\]) (\[username: (.+)?\])$/u;  // eslint-disable-line unicorn/no-unsafe-regex

// lorem-ipsum [id: 1234567890]
const REGEXP_NAMEID = /^(.+) (\[id: (.+)\])$/u;

// Field:Value
const REGEXP_NOTE_FIELD = /^(.+):(.+)?$/u;  // eslint-disable-line unicorn/no-unsafe-regex


const call = (input = '', args = {}, allowed = {}, aliases = {}) => {
	const command = `lpass ${input} ${dargs(args, { ignoreFalse:true, includes:allowed.concat(Object.keys(aliases)), aliases:aliases }).join(' ')}`;

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






/* eslint-disable require-await */
class LastPass {

	// lpass login [--trust] [--plaintext-key [--force, -f]] [--color=auto|never|always] USERNAME
	async login(username, args = {}) {
		ow(username, ow.string.nonEmpty);
		ow(args, ow.object);

		return call(`login "${username}"`, args, ['trust', 'plaintextKey', 'force', 'color']);
	}


	// lpass logout [--force, -f] [--color=auto|never|always]
	async logout(args = {}) {
		ow(args, ow.object);

		return call(`logout`, args, ['force', 'color']);
	}


	// lpass passwd
	async passwd() {
		return call(`passwd`);
	}


	// lpass show [--sync=auto|now|no] [--clip, -c] [--expand-multi, -x] [--all|--username|--password|--url|--notes|--field=FIELD|--id|--name] [--basic-regexp, -G|--fixed-strings, -F] [--color=auto|never|always] {NAME|UNIQUEID}*
	async show(nameOrUniqueId = [], args = {}) {
		ow(nameOrUniqueId, ow.any(ow.string.nonEmpty, ow.array));
		ow(args, ow.object);

		const entries = typeof nameOrUniqueId === 'string' ? [nameOrUniqueId] : nameOrUniqueId;

		// Is a single field query
		const selectedFields = [];
		['username', 'password', 'url', 'notes', 'id', 'name'].forEach((selected) => {
			if (args[selected] === true) {
				selectedFields.push(selected);
			}
		});

		if (args.field) {
			selectedFields.push(args.field);
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

		args.json = selectedFields.length === 0;


		// Call
		const results = call(`show "${entries.join('" "')}"`, args, ['sync', 'clip', 'expandMulti', 'all', 'username', 'password', 'url', 'notes', 'field', 'id', 'name', 'basicRegexp', 'fixedStrings', 'color', 'json']);

		if (results.success) {
			const lines     = results.raw.split('\n');
			const firstLine = lines.shift();

			// Multiple matches
			if (firstLine === MULTIPLE_MATCHES) {
				const matches = [];
				lines.forEach((line) => {
					const [, name, , id] = REGEXP_NAMEID.exec(line);
					matches.push({ name, id });
				});

				return {
					success: false,
					message: MULTIPLE_MATCHES,
					data:    matches,
					raw:     results.raw
				};
			}

			let data;

			// JSON output
			if (args.json) {

				data = JSON.parse(results.raw);
				data.forEach((entry) => {
					entry.last_modified_gmt = new Date(Number(entry.last_modified_gmt) * 1000);  // eslint-disable-line camelcase
					entry.last_touch        = new Date(Number(entry.last_touch) * 1000);         // eslint-disable-line camelcase

					// Try to figure out if extra fields are here
					if (entry.note.startsWith('NoteType:')) {
						let latestField;

						entry.note.split('\n').forEach((noteField) => {

							// Might break if field contains ':'
							const [, field, value = ''] = REGEXP_NOTE_FIELD.exec(noteField) || [];
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
				data = [{ [selectedFields[0]]:results.raw }];
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
	async ls(group = '', args = {}) {
		ow(group, ow.string);
		ow(args, ow.object);

		const results = call(`ls "${group}"`, args, ['sync', 'long', 'color'], { lastUse:'u' });

		if (results.success) {
			const data = [];

			results.raw.split('\n').forEach((entry) => {

				if (args.long) {
					const [, date, name, , id, , username] = REGEXP_SHOW_LONG.exec(entry);

					const dateKey   = `last_${args.lastUse ? 'touch' : 'modified_gmt'}`;
					const dateValue =  date ? new Date(args.lastUse ? date : `${date.replace(' ', 'T')}:00.000Z`) : undefined;

					data.push({
						name:     name,
						id:       id,
						username: username,
						[dateKey]: dateValue
					});

				} else {
					const [, name, , id] = REGEXP_NAMEID.exec(entry);
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
	async mv(uniqueNameOrUniqueId, group, args = {}) {
		ow(uniqueNameOrUniqueId, ow.string.nonEmpty);
		ow(group, ow.string.nonEmpty);
		ow(args, ow.object);

		return call(`mv "${uniqueNameOrUniqueId}" "${group}"`, args, ['sync', 'color']);
	}


	// lpass add [--sync=auto|now|no] [--non-interactive] {--name|--username, -u|--password, -p|--url|--notes|--field=FIELD|--note-type=NOTETYPE} [--color=auto|never|always] {NAME|UNIQUEID}
	async add(nameOrUniqueId, args = {}) {
		ow(nameOrUniqueId, ow.string.nonEmpty);
		ow(args, ow.object);

		return call(`add "${nameOrUniqueId}"`, args, ['sync', 'nonInteractive', 'name', 'username', 'password', 'url', 'notes', 'field', 'noteType', 'color']);
	}


	// lpass edit [--sync=auto|now|no] [--non-interactive] {--name|--username, -u|--password, -p|--url|--notes|--field=FIELD} [--color=auto|never|always] {NAME|UNIQUEID}
	async edit(nameOrUniqueId, args = {}) {
		ow(nameOrUniqueId, ow.string.nonEmpty);
		ow(args, ow.object);

		return call(`edit "${nameOrUniqueId}"`, args, ['sync', 'nonInteractive', 'name', 'username', 'password', 'url', 'notes', 'field', 'color']);
	}


	// lpass generate [--sync=auto|now|no] [--clip, -c] [--username=USERNAME] [--url=URL] [--no-symbols] [--color=auto|never|always] {NAME|UNIQUEID} LENGTH
	async generate(nameOrUniqueId, length = 32, args = {}) {
		ow(nameOrUniqueId, ow.string.nonEmpty);
		ow(length, ow.number.integer.inRange(4, 100));
		ow(args, ow.object);

		const results = call(`generate "${nameOrUniqueId}" ${length}`, args, ['sync', 'clip', 'username', 'url', 'noSymbols', 'color']);

		if (results.success) {
			return {
				success: true,
				data:    { password:results.raw },
				raw:     results.raw
			};
		}

		return results;
	}


	// lpass duplicate [--sync=auto|now|no] [--color=auto|never|always] {UNIQUENAME|UNIQUEID}
	async duplicate(uniqueNameOrUniqueId, args = {}) {
		ow(uniqueNameOrUniqueId, ow.string.nonEmpty);
		ow(args, ow.object);

		return call(`duplicate "${uniqueNameOrUniqueId}"`, args, ['sync', 'color']);
	}


	// lpass rm [--sync=auto|now|no] [--color=auto|never|always] {UNIQUENAME|UNIQUEID}
	async rm(uniqueNameOrUniqueId, args = {}) {
		ow(uniqueNameOrUniqueId, ow.string.nonEmpty);
		ow(args, ow.object);

		return call(`rm "${uniqueNameOrUniqueId}"`, args, ['sync', 'color']);
	}


	// lpass status [--quiet, -q] [--color=auto|never|always]
	async status(args = {}) {
		ow(args, ow.object);

		const results = call(`status`, args, ['quiet', 'color']);

		if (results.success) {
			const [, username] = REGEXP_LOGGED_IN.exec(results.raw) || [];

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
	async sync(args = {}) {
		ow(args, ow.object);

		return call(`sync`, args, ['background', 'color']);
	}


	// lpass import [--sync=auto|now|no] [FILENAME]
	async import(filename, args = {}) {
		ow(filename, ow.string.nonEmpty);
		ow(args, ow.object);

		return call(`import "${filename}"`, args, ['sync']);
	}


	// lpass export [--sync=auto|now|no] [--color=auto|never|always]
	async export(args = {}) {
		ow(args, ow.object);

		return call(`export`, args, ['sync', 'color']);
	}


	// lpass share userls SHARE
	async shareUserls(share) {
		ow(share, ow.string.nonEmpty);

		return call(`share userls "${share}"`);
	}


	// lpass share useradd [--read-only=[true|false]] [--hidden=[true|false]] [--admin=[true|false]] SHARE USERNAME
	async shareUseradd(share, username, args = {}) {
		ow(share, ow.string.nonEmpty);
		ow(username, ow.string.nonEmpty);
		ow(args, ow.object);

		return call(`share useradd "${share}" "${username}"`, args, ['readOnly', 'hidden', 'admin']);
	}


	// lpass share usermod [--read-only=[true|false]] [--hidden=[true|false]] [--admin=[true|false]] SHARE USERNAME
	async shareUsermod(share, username, args = {}) {
		ow(share, ow.string.nonEmpty);
		ow(username, ow.string.nonEmpty);
		ow(args, ow.object);

		return call(`share usermod "${share}" "${username}"`, args, ['readOnly', 'hidden', 'admin']);
	}


	// lpass share userdel SHARE USERNAME
	async shareUserdel(share, username) {
		ow(share, ow.string.nonEmpty);
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
	async shareLimit(share, username, sites = [], args = {}) {
		ow(share, ow.string.nonEmpty);
		ow(username, ow.string.nonEmpty);
		ow(sites, ow.any(ow.string.nonEmpty, ow.array));
		ow(args, ow.object);

		const list = typeof nameOrUniqueId === 'string' ? [sites] : sites;

		return call(`share limit "${share}" "${username}" ${list ? `"${list.join('" "')}"` : ''}`, args, ['deny', 'allow', 'add', 'rm', 'clear']);
	}

}


module.exports = new LastPass();
