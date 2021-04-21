/* Magic Mirror Module
 * By: Andrew Matayka
 * Module: MMM-ClickUPv2
 * Version: 0.01
 */

const NodeHelper = require("node_helper");
const request = require("request");
const fs = require("fs");

let accessToken = undefined;

module.exports = NodeHelper.create({
	//Ran on the start of the node helper
	start: function () {
		console.log("%cMMM-ClickUPv2 (node): Node Helper Started!", "color: yellow;");
	},

	//Ran when receiving notification from the module
	socketNotificationReceived: function (notification, payload) {
		if (notification === "Request_AccessToken") {
			this.config = payload;

			if (this.config.debug) console.log("\n%cMMM-ClickUPv2 (node): Request Access Token Notification Received!", "color: yellow;");

			this.requestAccessToken();
		} else if (notification === "Request_TasksList") {
			this.config = payload;

			if (true) console.log("\n%cMMM-ClickUPv2 (node): Request Tasks List Notification Received!", "color: green;");

			this.requestTasks();
		}
	},

	requestAccessToken: function () {
		const self = this;

		const path = self.path;
		let aTFData = "";

		//Find out if AccessToken is already found and in file. If not find the Access Token
		if (accessToken === undefined) {
			return new Promise(resolve => {
				fs.readFile(path + '/accessToken', 'UTF-8', (error, data) => {
					if (error) {
						self.sendSocketNotification("Error", {
							error: error
						});

						//if(data.includes("no such")) {
						let fd = fs.open(path + '/accessToken', 'w', (err, file) => {
							if (err) {
								throw err;
							}

							console.log("File is created.");
						});
						fd.close();

						this.requestAccessToken();
						//	return;
						//}

						return console.error("MMM-ClickUPv2 (node): " + error);
					}
					aTFData = data;

					//If the AccessToken file does not contain the Access Token, or does not exist.
					if (aTFData.length === 0) {
						if (this.config.debug) console.log("%cMMM-ClickUPv2 (node): Requesting Access Token!", "color: yellow;")

						request({
								url: "https://api.clickup.com/api/v2/oauth/token",
								method: "POST",
								headers: {
									"content-type": "application/json",
									"cache-control": "no-cache"
								},
								form: {
									client_id: self.config.clientID,
									client_secret: self.config.clientSecret,
									code: self.config.accessCode
								}
							},
							function (error, response, body) {
								if (error) {
									self.sendSocketNotification("Error", {
										error: error
									});
									return console.error("MMM-ClickUPv2 (node): " + error);
								}
								if (response.statusCode === 200) {
									let responseJson = JSON.parse(body);
									accessToken = responseJson.access_token;
									if (self.config.debug) console.log("%cMMM-ClickUPv2 (node): Access Token Received: '" + accessToken + "'!", "color: yellow;");

									fs.appendFile(path + '/accessToken', accessToken, (err) => {
										if (err) {
											console.log(err)
										}
										if (self.config.debug) console.log("%cMMM-ClickUPv2 (node): Writing Access Token to file!", "color: yellow;")
									});

									resolve(accessToken);
								} else {
									if (self.config.debug) console.log("%cMMM-ClickUPv2 (node): ClickUP api request status - '" + response.statusCode + "'!", "color: yellow;");
									if (self.config.debug) console.log("%cMMM-ClickUPv2 (node): ClickUP api request response - '" + response.body + "'!", "color: yellow;");

									self.sendSocketNotification("Error", {
										error: response.body,
										statusCode: response.statusCode
									});
								}
							});
					} else { //If the Access Token is found in the accessToken file
						if (this.config.debug) console.log("%cMMM-ClickUPv2 (node): Read Access Token from file: '" + aTFData + "'!", "color: yellow;");
						resolve(aTFData);
					}
				});
			}).then(value => {
				accessToken = value;
				self.config.accessToken = value;
				self.sendSocketNotification("AccessToken", value);
			});
		} else {
			console.log("Found Access Token! No need to request!");
			self.config.accessToken = accessToken;
			self.sendSocketNotification("AccessToken", accessToken);
		}
	},

	requestTasks: function () {
		const self = this;

		if (accessToken !== undefined) {
			try {
				console.log("Got Access Token, ALL GOOD!");
				return new Promise(resolve => {
					if (this.config.debug) console.log("%cMMM-ClickUPv2 (node): Requesting Teams ID!", "color: green;");
					request({
						url: "https://api.clickup.com/api/v2/team",
						method: "GET",
						headers: {
							Authorization: accessToken
						}
					}, function (error, response, body) {
						if (!error) {
							resolve(JSON.parse(body).teams[0].id);
						} else {
							console.error(error);
							resolve(error)
						}
					});
				}).then(value => {
					if (this.config.debug) console.log("%cMMM-ClickUPv2 (node): Received Teams ID: " + value, "color: green;");

					return new Promise(function (resolve) {
						request({
							url: 'https://api.clickup.com/api/v2/team/' + value + '/space',
							method: "GET",
							headers: {
								Authorization: accessToken
							},
						}, function (error, response, body) {
							if (!error)
								resolve(JSON.parse(body).spaces[0].id);
							else {
								console.error(error);
								resolve(error);
							}
						});
					}).then(value => {
						if (this.config.debug) console.log("%cMMM-ClickUPv2 (node): Received Spaces ID: " + value, "color: green;");

						return new Promise(function (resolve) {
							request({
								url: 'https://api.clickup.com/api/v2/space/' + value + '/folder',
								method: "GET",
								headers: {
									Authorization: accessToken
								},
							}, function (error, response, body) {
								if (!error) {
									//resolve(JSON.parse(body).folders[1].id);
									let folders = JSON.parse(body).folders;

									folders.forEach(folder => {
										if (self.config.folderName === folder.name) {
											resolve(folder.id);
										}
									});
								} else {
									console.error(error);
									resolve(error)
								}
							});
						}).then(value => {
							if (this.config.debug) console.log("%cMMM-ClickUPv2 (node): Received Folders ID: " + value, "color: green;")

							return new Promise(function (resolve) {
								request({
									url: 'https://api.clickup.com/api/v2/folder/' + value + '/list',
									method: "GET",
									headers: {
										Authorization: accessToken
									},
								}, function (error, response, body) {
									if (!error) {
										//resolve(JSON.parse(body).lists[0].id);
										let lists = JSON.parse(body).lists;

										lists.forEach(list => {
											if (self.config.listName === list.name) {
												resolve(list.id);
											}
										});
									} else {
										console.error(error);
										resolve(error);
									}
								});
							}).then(value => {
								if (this.config.debug) console.log("%cMMM-ClickUPv2 (node): Received Lists ID: " + value, "color: green;");

								return new Promise(function (resolve) {
									request({
										url: 'https://api.clickup.com/api/v2/list/' + value + '/task?archived=false&subtasks=true&include_closed=true&order_by=due_date',
										method: "GET",
										headers: {
											Authorization: accessToken
										},
									}, function (error, response, body) {
										if (!error)
											resolve(JSON.parse(body));
										else
											resolve(error);
									});
								}).then(value => {
									if (this.config.debug) console.log("%cMMM-ClickUPv2 (node): Received Tasks!", "color: green;");

									self.sendSocketNotification("Tasks_List", value);
								});
							});
						});
					});
				})
			} catch (e) {
				console.log(e);
			}
		} else {
			if (this.config.debug) console.log("%cMMM-ClickUPv2: No Access Token Found!!!", "color: cyan;");
		}
		console.log("Still here");
	}
});
