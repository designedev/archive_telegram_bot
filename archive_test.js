var archive = require('archive.is');
var telegram = require('telegram-bot-api');
var urlRegex = require('url-regex');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./db/user_dev.db');

var master_user_name = 'torrent';
var master_user_id = 58034127;

var api = new telegram({
	token: '346329246:AAGiLncu5A1KwNO2N0AIWN13AEOWqjIRA20',
	updates: {enabled: true}
});

createTable();

api.on('message', function(message) {
/*
	console.log(message);
	console.log("======================");
	console.log(message.text);
	console.log(urlRegex().test(message.text));
	console.log("======================");
*/
	var msg = message.text;
	if(msg == 'log') {
		readLog(message);
	}

	if(urlRegex().test(msg)) {
		archive.save(msg).then(function(result) {
		send_msg( 
			message, true,
			`${message.from.first_name} ${message.from.last_name} 님이 요청하신 주소에 대한 처리가 완료되었습니다.\n ====>\n ${result.shortUrl} `
		);
		insertRows(message.user.id, message.from.username, msg, result.shortUrl);
		if(message.from.username != master_user_name) {
			send_msg(master_user_id, `${message.from.username} 님이 아카이빙을 요청했습니다.\n URL : \n ${result.shortUrl}`);
		}
	}, function (error) {
		send_msg(message.chat.id, "저장 서버에 문제가 있는 것 같습니다. 잠시 뒤에 다시 시도해 주세요." );
		console.log(error);
	});
	}
});


function send_msg(message, isPublic, msg) {
	var receive_id = mesage.user.id;
	if(isPublic) {
		reveive_id = message.chat.id;
	}
	api.sendMessage({
		chat_id: reveive_id,
		text: msg
	}).then(function(msg) {
		console.log(msg);
	});
}

function createTable() {
	console.log("create Table..");
	db.run("CREATE TABLE IF NOT EXISTS SENT_USER(ID INTEGER PRIMARY KEY, USER_ID INTEGER, USER_NAME TEXT, URL TEXT, SHORTEN TEXT)");
}

function insertRows(id, name, url, shorten) {
	console.log(`insert archiving log for USER : ${id}, URL : ${url}. Archived URL : ${shorten}...`);
	var statement = db.prepare("INSERT INTO SENT_USER (USER_ID, USER_NAME, URL, SHORTEN) VALUES (?, ?, ?, ?)");
	statement.run(id, name, url, shorten);
	statement.finalize();
}

function readLog(message) {
	console.log(message);
	var log = '';
	var user_id = message.chat.id
	var preparedStmt = "SELECT * FROM SENT_USER WHERE USER_ID = " + user_id;
	db.all(preparedStmt, function(err, rows) {
		rows.forEach(function(row) {
			log += row.ID + " - " + row.USER_ID + " - " + row.USER_NAME + " - " + row.URL + " - " + row.SHORTEN + "\n";
		});
		send_msg(user_id, log);
	});
}






