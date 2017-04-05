var archive = require('archive.is');
var telegram = require('telegram-bot-api');
var urlRegex = require('url-regex');
var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('./db/user.db');

var master_user_name = 'torrent';
var master_user_id = 58034127;

var work_count = 0;
const MAX_WORK_COUNT = 10;

var api = new telegram({
	token: '291091522:AAE1mQYokX4-x6uH7qWGVPL_6dihU6GlJDU',
	updates: {enabled: true}
});

createTable();


/*
TELEGRAM MESSAGE DATA FORMAT...

{ message_id: 29,
  from: 
   { id: 58034127,
     first_name: 'Torrent',
     last_name: 'of Rivia',
     username: 'torrent' },
  chat: 
   { id: 58034127,
     first_name: 'Torrent',
     last_name: 'of Rivia',
     username: 'torrent',
     type: 'private' },
  date: 1491117892,
  text: '312' }
*/

api.on('message', function(message) {
	// console.log(message);
	var msg = message.text;
	if(msg == '!!기록!!') {
		history(message);
	}
	else if(urlRegex().test(msg)) {
		if (check_quota(message)) {
			console.log("bot working : " + work_count + "/" + MAX_WORK_COUNT);
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
			reduce_quota();
		}, function (error) {
			send_msg(message.from.id, "요청하신 URL을 저장하는데 문제가 발생했습니다. \n보통 archive.is 의 문제입니다. \n잠시 뒤에 다시 시도해 주세요." );
			//send_msg_to_master(`${message.from.username} 님의 요청에 오류가 발생했습니다.`);
			reduce_quota();
			// console.log(error);
		});
		}
	}
	else {
		if(message.from.id == message.chat.id) {
			var usage = `
				아카이빙 봇의 사용법은 아래와 같습니다.\n
				아카이빙하려는 주소만 입력한다. 끝.
			`;
			send_msg(message.from.id, usage);
		}
	}
});

function check_quota(message) {
	if(work_count >= MAX_WORK_COUNT) {
		send_msg(message.chat.id, "너무 많은 사용자들이 사용하고 있습니다. \n조금 뒤에 시도해주세요.");
		send_msg_to_master("사용자가 너무 많습니다. 대박");
		return false;
	}
	else {
		work_count++;
		console.log(`work count increased ( ${work_count} )`);
		return true;
	}
}

function reduce_quota() {
	work_count --;
	if(work_count <= 0) work_count == 0;
	console.log(`work count decreased ( ${work_count} )`);
}


function send_msg(chat_id, msg) {
	api.sendMessage({
		chat_id: chat_id,
		text: msg
	}).then(function(msg) {
		// console.log(msg);
	}, function(error) {
		// console.log(error);
	});
}

function send_msg_to_master(msg) {
	send_msg(master_user_id, msg);
}

function createTable() {
	console.log("initialize db.. create table if not exists..");
	db.run("CREATE TABLE IF NOT EXISTS SENT_USER(ID INTEGER PRIMARY KEY, USER_ID INTEGER, USER_NAME TEXT, URL TEXT, SHORTEN TEXT, CREATED_AT DATE)");
}

function insert(id, name, url, shorten) {
	console.log(`insert archiving log for USER : ${id}, URL : ${url}. Archived URL : ${shorten}...`);
	var statement = db.prepare("INSERT INTO SENT_USER (USER_ID, USER_NAME, URL, SHORTEN, CREATED_AT) VALUES (?, ?, ?, ?, datetime('now','localtime'))");
	statement.run(id, name, url, shorten);
	statement.finalize();
}


function history(message) {
	if (check_quota(message)) {
		if(message.from.id == message.chat.id) {
			var log = `${message.from.first_name} ${message.from.last_name} 님의 요청내역..\n`;
			var user_id = message.from.id;
			var preparedStmt = "SELECT USER_ID, URL, SHORTEN, strftime('%Y-%m-%d:%H:%M:%S')AS CREATED FROM SENT_USER WHERE USER_ID = " + user_id;
			db.all(preparedStmt, function(err, rows) {
				if( rows.length == 0) {
					send_msg(message.chat.id, log + "요청 내역이 없습니다.");
					reduce_quota();
				}
				else if(rows.length > 0) {
					rows.forEach(function(row, index) {
						log += "[" + (index + 1) + "] " + row.SHORTEN + " \n";
					});
					send_msg(message.chat.id, log);
					reduce_quota();
				}
			});
		}
		else {
			reduce_quota();
		}
	}
}
