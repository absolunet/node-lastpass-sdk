# @absolunet/lastpass-sdk

[![npm](https://img.shields.io/npm/v/@absolunet/lastpass-sdk.svg)](https://www.npmjs.com/package/@absolunet/lastpass-sdk)
[![npm dependencies](https://david-dm.org/absolunet/node-lastpass-sdk/status.svg)](https://david-dm.org/absolunet/node-lastpass-sdk)
[![npms](https://badges.npms.io/%40absolunet%2Flastpass-sdk.svg)](https://npms.io/search?q=%40absolunet%2Flastpass-sdk)
[![Travis CI](https://travis-ci.com/absolunet/node-lastpass-sdk.svg?branch=master)](https://travis-ci.com/absolunet/node-lastpass-sdk/builds)
[![Code style ESLint](https://img.shields.io/badge/code_style-@absolunet/node-659d32.svg)](https://github.com/absolunet/eslint-config-node)

> [LastPass](https://www.lastpass.com/) SDK via [lpass(1)](https://lastpass.github.io/lastpass-cli/lpass.1.html)

Maps every subcommands from the [LastPass CLI](https://github.com/lastpass/lastpass-cli) and tries to parse the results into Objects


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


## API
- Uses [dargs](https://github.com/sindresorhus/dargs#readme) for arguments mapping
- Successful calls returns an Object with `success:true`, `raw` properties (Some return a `data` property with parsed data)
- Failed calls returns an Object with `success:false`, `message` properties (Some may also return `data`, `raw` if pertinent)
<br>

### login(username *[, args]*)
Login to LastPass

#### username
*Required*<br>
Type: `String`<br>
LastPass username



<br>

### logout(*[args]*)
Logout from LastPass



<br>

### passwd()
Change master password



<br>

### show(nameOrUniqueId *[, args]*)
Show entries details<br>
Returns data as an `Array` of `Object` of entry's fields

#### nameOrUniqueId
*Required*<br>
Type: `String` or `Array[String]`<br>
Entry name or unique id



<br>

### ls(*[group] [, args]*)
List all entries
Returns data as an `Array` of `Object` of entry's fields

#### group
Type: `String`<br>
Group name



<br>

### mv(uniqueNameOrUniqueId, group *[, args]*)
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

### add(nameOrUniqueId *[, args]*)
Add entry

#### nameOrUniqueId
*Required*<br>
Type: `String`<br>
Entry name or unique id



<br>

### edit(nameOrUniqueId *[, args]*)
Edit entry

#### nameOrUniqueId
*Required*<br>
Type: `String`<br>
Entry name or unique id



<br>


### generate(nameOrUniqueId *[, length] [, args]*)
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

### duplicate(uniqueNameOrUniqueId *[, args]*)
Duplicate entry

#### uniqueNameOrUniqueId
*Required*<br>
Type: `String`<br>
Unique entry name or id



<br>

### rm(uniqueNameOrUniqueId *[, args]*)
Remove entry

#### uniqueNameOrUniqueId
*Required*<br>
Type: `String`<br>
Unique entry name or id



<br>

### status(*[args]*)
Check if logged
Returns data as an `Object` with username



<br>

### sync(*[args]*)
Synchronize the local cache with the LastPass servers



<br>

### import(filename *[, args]*)
Import entries

#### filename
*Required*<br>
Type: `String`<br>
Path to file to import



<br>

### export(*[args]*)
Export entries



<br>

### shareUserls(share)
List users of a shared folder

#### share
*Required*<br>
Type: `String`<br>
Shared folder



<br>

### shareUseradd(share, username *[, args]*)
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

### shareUsermod(share, username *[, args]*)
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

### shareLimit(share, username *[, sites] [, args]*)
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






## License

MIT © [Absolunet](https://absolunet.com)