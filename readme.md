# @absolunet/lastpass-sdk

[![npm](https://img.shields.io/npm/v/@absolunet/lastpass-sdk.svg)](https://www.npmjs.com/package/@absolunet/lastpass-sdk)
[![npm dependencies](https://david-dm.org/absolunet/node-lastpass-sdk/status.svg)](https://david-dm.org/absolunet/node-lastpass-sdk)
[![npms](https://badges.npms.io/%40absolunet%2Flastpass-sdk.svg)](https://npms.io/search?q=%40absolunet%2Flastpass-sdk)
[![Travis CI](https://travis-ci.com/absolunet/node-lastpass-sdk.svg?branch=master)](https://travis-ci.com/absolunet/node-lastpass-sdk/builds)
[![Code style ESLint](https://img.shields.io/badge/code_style-@absolunet/node-659d32.svg)](https://github.com/absolunet/eslint-config-node)

> [LastPass](https://www.lastpass.com/) SDK via [lpass(1)](https://lastpass.github.io/lastpass-cli/lpass.1.html)

Maps every subcommands from the [LastPass CLI](https://github.com/lastpass/lastpass-cli) and tries to parse the results into Objects

Also contains wrapper functions to help with some shortcomings of the CLI


## Install

```sh
$ npm install @absolunet/lastpass-sdk
```


## Usage

```js
const lastpass = require('@absolunet/lastpass-sdk');

const { success:logged } = lastpass.login('user@example.com');
if (logged) {

	const results = lastpass.show('site-prod-ubuntu', { password:true });
	if (results.success) {
		console.log(results.data[0].password);
	} else {
		console.error(`Something went wrong: ${results.message}`);
	}
}
```


## API - CLI
- Uses [dargs](https://github.com/sindresorhus/dargs#readme) for arguments mapping
- Successful calls returns an Object with `success:true`, `raw` properties (Some return a `data` property with parsed data)
- Failed calls returns an Object with `success:false`, `message` properties (Some may also return `data`, `raw` if pertinent)
<br>

### login(username *[, parameters]*)
Login to LastPass

#### username
*Required*<br>
Type: `String`<br>
LastPass username


#### parameters.password
Type: `String`<br>
LastPass password if you want to skip the manual PIN entry



<br>

### logout(*[parameters]*)
Logout from LastPass



<br>

### passwd()
Change master password



<br>

### show(nameOrUniqueId *[, parameters]*)
Show entries details<br>
Returns data as an `Array` of `Object` of entry's fields

#### nameOrUniqueId
*Required*<br>
Type: `String` or `Array[String]`<br>
Entry name or unique id



<br>

### ls(*[group] [, parameters]*)
List all entries
Returns data as an `Array` of `Object` of entry's fields

#### group
Type: `String`<br>
Group name



<br>

### mv(uniqueNameOrUniqueId, group *[, parameters]*)
Move entry to another group

#### uniqueNameOrUniqueId
*Required*<br>
Type: `String`<br>
Unique entry name or id


#### group
*Required*<br>
Type: `String`<br>
Group name



<br>

### add(nameOrUniqueId *[, parameters]*)
Add entry

#### nameOrUniqueId
*Required*<br>
Type: `String`<br>
Entry name or unique id



<br>

### edit(nameOrUniqueId *[, parameters]*)
Edit entry

#### nameOrUniqueId
*Required*<br>
Type: `String`<br>
Entry name or unique id



<br>


### generate(nameOrUniqueId *[, length] [, parameters]*)
Generate password
Returns data as an `Object` with password

#### nameOrUniqueId
*Required*<br>
Type: `String`<br>
Entry name or unique id

#### length
Type: `String`<br>
Password length<br>
*Default: 32*



<br>

### duplicate(uniqueNameOrUniqueId *[, parameters]*)
Duplicate entry

#### uniqueNameOrUniqueId
*Required*<br>
Type: `String`<br>
Unique entry name or id



<br>

### rm(uniqueNameOrUniqueId *[, parameters]*)
Remove entry

#### uniqueNameOrUniqueId
*Required*<br>
Type: `String`<br>
Unique entry name or id



<br>

### status(*[parameters]*)
Check if logged
Returns data as an `Object` with username



<br>

### sync(*[parameters]*)
Synchronize the local cache with the LastPass servers



<br>

### import(filename *[, parameters]*)
Import entries

#### filename
*Required*<br>
Type: `String`<br>
Path to file to import



<br>

### export(*[parameters]*)
Export entries



<br>

### shareUserls(share)
List users of a shared folder

#### share
*Required*<br>
Type: `String`<br>
Shared folder



<br>

### shareUseradd(share, username *[, parameters]*)
Add user to a shared folder

#### share
*Required*<br>
Type: `String`<br>
Shared folder

#### username
*Required*<br>
Type: `String`<br>
LastPass username



<br>

### shareUsermod(share, username *[, parameters]*)
Modify user of a shared folder

#### share
*Required*<br>
Type: `String`<br>
Shared folder

#### username
*Required*<br>
Type: `String`<br>
LastPass username



<br>

### shareUserdel(share, username)
Delete user from a shared folder

#### share
*Required*<br>
Type: `String`<br>
Shared folder

#### username
*Required*<br>
Type: `String`<br>
LastPass username



<br>

### shareCreate(share)
Create a shared folder

#### share
*Required*<br>
Type: `String`<br>
Shared folder



<br>

### shareRm(share)
Remove a shared folder

#### share
*Required*<br>
Type: `String`<br>
Shared folder



<br>

### shareLimit(share, username *[, sites] [, parameters]*)
Manipulate account access lists on a shared folder for a specific user

#### share
*Required*<br>
Type: `String`<br>
Shared folder

#### username
*Required*<br>
Type: `String`<br>
LastPass username

#### sites
*Required*<br>
Type: `String` or `Array[String]`<br>
Sites






## API - Helpers

### scan(searchInput *[, options]*)
Scans for entries via 'lpass show' (**IMPORTANT:** Must be logged in or will throw an error)<br>
Returns an `Array` of `Object` of entries fullname and id<br>

#### searchInput
*Required*<br>
Type: `String` or `Array[String]`<br>
Entry name or search patterns

#### options.basicRegexp
Type: `Boolean`<br>
Activate 'lpass show --basic-regexp' flag

#### options.fixedStrings
Type: `Boolean`<br>
Activate 'lpass show --fixed-strings' flag






## License

MIT © [Absolunet](https://absolunet.com)
