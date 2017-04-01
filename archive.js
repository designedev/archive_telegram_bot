var archive = require('archive.is');
var telegram = require('telegram-bot-api');
var urlRegex = require('url-regex');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./db/user.db');

var master_user_name = 'torrent';
var master_user_id = 58034127;

var api = new telegram({
	token: '291091522:AAE1mQYokX4-x6uH7qWGVPL_6dihU6GlJDU',
	updates: {enabled: true}
});

createTable();

api.on('message', function(message) {
	var msg = message.text;
	if(msg == '기록') {
		history(message);
	}
	else if(urlRegex().test(msg)) {
		archive.save(msg).then(function(result) {
			//send message to requested user.
			send_msg(
				message.chat.id,
				`${message.from.first_name} ${message.from.last_name} 님이 요청하신 주소에 대한 처리가 완료되었습니다.\n ====>\n ${result.shortUrl} `
			);

			//insert query date to sqlite3 DB.
			insert(message.from.id, message.from.username, msg, result.shortUrl);

			//if user request archiving, notify to master.
			if(message.from.id != master_user_id) {
				send_msg_to_master(`${message.from.username} 님이 아카이빙을 요청했습니다.\n URL : \n ${result.shortUrl}`);
			}
		}, function (error) {
			send_msg(message.from.id, "요청하신 URL을 저장하는데 문제가 발생했습니다. \n보통 archive.is 의 문제입니다. \n잠시 뒤에 다시 시도해 주세요." );
			send_msg_to_master(`${message.from.username} 님의 요청에 오류가 발생했습니다.`);
			console.log(error);
		});
	}
	else {
		if(message.from.id == message.chat.id) {
			var usage = `
				아카이빙 봇의 사용법은 아래와 같습니다.\n
				1. 아카이빙하려는 주소만 입력한다.
				2. 본인의 요청내역을 보고 싶은 경우, '기록' 을 입력한다.\n
				감사합니다.
			`;
			send_msg(message.from.id, usage);
		}
	}
});


function send_msg(reveive_id, msg) {
	api.sendMessage({
		chat_id: reveive_id,
		text: msg
	}).then(function(msg) {
		console.log(msg);
	});
}

function send_msg_to_master(msg) {
	send_msg(master_user_id, msg);
}

function createTable() {
	console.log("initialize db.. create table if not exists..");
	db.run("CREATE TABLE IF NOT EXISTS SENT_USER(ID INTEGER PRIMARY KEY, USER_ID INTEGER, USER_NAME TEXT, URL TEXT, SHORTEN TEXT)");
}

function insert(id, name, url, shorten) {
	console.log(`insert archiving log for USER : ${id}, URL : ${url}. Archived URL : ${shorten}...`);
	var statement = db.prepare("INSERT INTO SENT_USER (USER_ID, USER_NAME, URL, SHORTEN) VALUES (?, ?, ?, ?)");
	statement.run(id, name, url, shorten);
	statement.finalize();
}

function history(message) {
	console.log(message);
	var log = `${message.from.first_name} ${message.from.last_name} 님의 요청내역..\n`;
	var user_id = message.from.id;
	var preparedStmt = "SELECT * FROM SENT_USER WHERE USER_ID = " + user_id;
	db.all(preparedStmt, function(err, rows) {
		rows.forEach(function(row, index) {
			log += index + 1 + " : " + row.URL + " - " + row.SHORTEN + "\n";
		});
		send_msg(user_id, log);
	});
}

