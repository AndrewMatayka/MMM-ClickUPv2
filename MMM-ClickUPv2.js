/* Magic Mirror Module
 * By: Andrew Matayka
 * Module: MMM-ClickUPv2
 * Version: 1.00
 */
let receivedToken = false;
let loaded = false;
let userPresence = true;

//#region NEW LOG FUNCTION
const Log = {
	info: function (message) {
		console.log("%cInfo: " + message + "\n", "color: gray");
	},

	trace: function (message, that) {
		console.log("%c" + that.name + ": " + message, "color: cyan");
	},

	log: function (message) {
		console.log(message);
	},

	error: function (message, that) {
		if (that !== null) {
			console.log("%c" + that.name + " - Error: " + message, "color: red");
		} else {
			console.log("%c" + "MMM-ClickUPv2" + " - Error: " + message, "color: red");
		}
	},

	table: function (message) {
		console.table(message);
	}
};
//#endregion

Module.register("MMM-ClickUPv2", {
	//#region Default Config Values
	defaults: {
		folderName: "Education", //Define Folder Name for Folder you Want Tasks From
		listName: "Homework", //Define List Name From the Folder You Wanted Tasks From

		updateInterval: 60 * 1000, //How often module is updated: (Min * Sec * Ms) = Every 60 Seconds

		taskTypes: ["Class", "Type"], //The Task Types you want to be shown (Custom Fields)
		completedStatus: "submitted", //Name of the status used to mark completion
		crossedOffStatuses: ["finished"], //Name of the statuses you want to always be shown but crossed out. Don't include the completed status.
		maxCompletedTaskCount: 3, //The max amount of shown completed tasks
		dontShowUntilStartDate: true, //If true, will hide any tasks until their start date. If false will show all tasks as normal
		includeTextInStatusIndicatorCell: true, //Self-Evident
		showSubmittedSubtasks: false, //Self-Evident

		clientID: "",
		clientSecret: "",
		accessCode: "",

		debug: false,
	},
	//#endregion

	//#region Get Requirements
	//Gets the styles for the module
	getStyles: function () {
		return [
			this.file('MMM-ClickUPv2.css')
		]
	},

	//The header displayed above the Module - Can be configured by User
	getHeader: function () {
		if (this.data.header === undefined) {
			return 'ClickUP';
		} else {
			return this.data.header;
		}
	},
	//#endregion

	//#region Startup
	//Ran at start of module
	start: function () {
		if (this.config.debug) Log.trace("Getting Styles: " + this.getStyles(), this);

		Log.info("Starting Module: " + this.name);

		const self = this; //Set variable self to this object

		this.moduleHidden = false;

		//Need to check if we already have Access Token. If not we need to acquire it.
		if (this.config.accessToken !== null && this.config.accessToken !== undefined && this.config.accessToken !== "") {
			//We have Access Token
			if (this.config.debug) Log.trace("Found Access Token: " + this.config.accessToken, this);
		} else {
			//Send request to get Access Token
			if (this.config.debug) Log.trace("Requesting Access Token", this);

			this.sendSocketNotification('Request_AccessToken', this.config); //Request Access Token from Node Helper
		}

		//Set interval to try and look for received token every half second.
		let interId = setInterval(() => {
			if (receivedToken !== true && (this.config.accessToken === "" || this.config.accessToken === null || this.config.accessToken === undefined)) {
				loaded = false;
				if (this.config.debug) Log.trace("Access Token Not Available Yet", this);
			} else {
				loaded = true;
				if (this.config.debug) Log.trace("Access Token Available!", this);
				self.sendSocketNotification('Request_TasksList', this.config);
				clearInterval(interId);
			}
		}, 50);

		this.updateIntervalID = setInterval(function () {
			self.sendSocketNotification('Request_TasksList', this.config);
		}, this.config.updateInterval);
	},
	//#endregion
	//#region Change State
	//Ran on suspension of module
	suspend: function () {
		this.moduleHidden = true;
		this.userPresenceUpdate();
	},

	//Ran on resume of module
	resume: function () {
		this.moduleHidden = false;
		this.userPresenceUpdate();
	},

	userPresenceUpdate: function () {
		if (userPresence === true && this.moduleHidden === false) {
			let self = this;

			// update now
			this.sendSocketNotification("Request_TasksList", this.config);

			//if no IntervalID defined, we set one again. This is to avoid several setInterval simultaneously
			if (this.updateIntervalID === 0) {
				this.updateIntervalID = setInterval(function () {
					self.sendSocketNotification("Request_TasksList", self.config);
				}, this.config.updateInterval);
			}
		} else { //if (UserPresence = false OR ModuleHidden = true)
			clearInterval(this.updateIntervalID); // stop the update interval of this module
			this.updateIntervalID = 0; //reset the flag to be able to start another one at resume
		}
	},
	//#endregion

	//#region Notifications Received
	//Ran when receiving notifications from other Modules
	notificationReceived: function (notification, payload) {
		if (notification === "USER_PRESENCE") { // notification Sent by module MMM-PIR-Sensor.
			userPresence = payload;
			this.userPresenceUpdate();
		}
	},

	//Ran when receiving notification from Node Helper
	socketNotificationReceived: function (notification, payload) {
		if (notification === "AccessToken") {
			if (this.config.debug) Log.trace("Received Access Token: " + payload, this);
			this.config.accessToken = payload;
			receivedToken = true;
		} else if (notification === "Tasks_List") {
			if (this.config.debug) Log.trace("Received Tasks List: " + payload, this);

			this.filterTasksList(payload.tasks);
		} else if (notification === "Error") {
			Log.error("Received Error: " + JSON.stringify(payload.error).err, this)
		}
	},
	//#endregion

	//#region Filtering
	//Filter through the received tasks list in order to remove submitted tasks over a certain threshold and to sort between child tasks and regular tasks
	filterTasksList: function (tasks) {
		let submittedCount = 0;

		let items = []; //Array of individual tasks that dont have parents
		let parents = []; //Array of individual tasks that have parents

		//Log tasks to a table if debug is enabled
		if (this.config.debug) Log.log("TASKS TABLE:");
		if (this.config.debug) Log.table(tasks);

		//Push every task into the array of items so we can access tasks individually.
		tasks.forEach(task => {
			if (task.parent === null) {
				if (task.status.status !== this.config.completedStatus || submittedCount < this.config.maxCompletedTaskCount) {
					items.push(task);

					if (task.status.status === this.config.completedStatus)
						submittedCount++;
				}
			} else {
				if (this.config.showSubmittedSubtasks) {
					parents.push(task);
				} else {
					if (task.status.status !== this.config.completedStatus)
						parents.push(task);
				}
			}
		});

		this.tasks = {
			"items": items,
			"parents": parents
		}

		this.loaded = true;
		this.updateDom(1000);
	},
	//#endregion

	//#region Create Cell Types
	createCell: function (className, innerHTML, style) {
		let cell = document.createElement("td");
		cell.className = "divTableCell " + className;
		cell.innerHTML = innerHTML;

		if (style !== null) {
			cell.style = style;
		}

		cell.colSpan = 1;
		if (cell.className.includes("title"))
			if (!innerHTML.includes("└→"))
				cell.colSpan = 2;

		return cell;
	},

	//Add suffix to date depending on the day. {st, nd, rd, th}
	dateOrdinal: function (d) {
		return d + (31 === d || 21 === d || 1 === d ? "st" : 22 === d || 2 === d ? "nd" : 23 === d || 3 === d ? "rd" : "th");
	},

	//Format Time into Local Time Zone
	formatTime: function (d) {
		function z(n) {
			return (n < 10 ? "0" : "") + n;
		}

		let h = d.getHours();
		let m = z(d.getMinutes());
		if (this.config.timeFormat === 12) {
			return " " + (h % 12 || 12) + ":" + m + (h < 12 ? " AM" : " PM");
		} else {
			return " " + h + ":" + m;
		}
	},

	//Add Due Date Cell and Localize Names based on how far they are (Monday, Tuesday, Tomorrow, Today, Yesterday, Etc...)
	addDueDateCell: function (item) {
		let className = "align-right dueDate ";
		let innerHTML = "";

		if (item.due_date !== null) {
			className += "bright ";
			const oneDay = 24 * 60 * 60 * 1000;
			let dueDateTime = new Date(parseInt(item.due_date));
			let dueDate = new Date(dueDateTime.getFullYear(), dueDateTime.getMonth(), dueDateTime.getDate());
			let now = new Date();
			let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			let diffDays = Math.floor((dueDate - today) / (oneDay));
			let diffMonths = (dueDate.getFullYear() * 12 + dueDate.getMonth()) - (now.getFullYear() * 12 + now.getMonth());
			let allDay = (dueDateTime.getHours() + ":" + dueDateTime.getMinutes());

			if (diffDays < -1) {
				innerHTML = dueDate.toLocaleDateString(config.language, {
					"month": "long"
				}) + " " + this.dateOrdinal(dueDate.getDate());
				className += "xsmall overdue";
			} else if (diffDays === -1) {
				innerHTML = this.translate("YESTERDAY");
				className += "xsmall overdue";
			} else if (diffDays === 0) {
				innerHTML = this.translate("TODAY");
				if (allDay === "4:0" || dueDateTime >= now) {
					className += "today";
				} else {
					className += "overdue";
				}
			} else if (diffDays === 1) {
				innerHTML = this.translate("TOMORROW");
				className += "xsmall tomorrow";
			} else if (diffDays < 4) {
				innerHTML = dueDate.toLocaleDateString(config.language, {
					"weekday": "long"
				});
				className += "xsmall";
			} else if (diffMonths < 7 || dueDate.getFullYear() === now.getFullYear()) {
				innerHTML = dueDate.toLocaleDateString(config.language, {
					"month": "long"
				}) + " " + this.dateOrdinal(dueDate.getDate());
				className += "xsmall";
			} else if (item.due_date === "2100-12-31") {
				innerHTML = "";
				className += "xsmall";
			} else {
				innerHTML = dueDate.toLocaleDateString(config.language, {
					"month": "long"
				}) + " " + this.dateOrdinal(dueDate.getDate()) + " " + dueDate.getFullYear();
				className += "xsmall";
			}

			if (innerHTML !== "" && allDay !== "4:0") {
				innerHTML += " @ " + this.formatTime(dueDateTime);
			}
		} else {
			innerHTML += "N/A";
			className += "light xsmall normal";
		}
		return this.createCell(className, innerHTML);
	},


	//Add Title Cell
	addTitleCell: function (item) {
		//If subtask then add subtask arrow
		if (item.parent !== null)
			item.name = "└→ " + item.name;

		return this.createCell("title bright alignLeft", item.name);
	},

	//Add Space for Organization
	addColumnSpacerCell: function () {
		return this.createCell("spacer", "&nbsp;");
	},

	//Add Space for Organization and Subtasks
	addColumnSubSpacerCell: function () {
		return this.createCell("subSpacer", "&nbsp;");
	},

	//Add Priority indicator for task
	addPriorityIndicatorCell: function (item) {
		let className = "priority ";
		let style = "";

		if (item.priority !== null) {
			style = "background-color: " + item.priority.color + ";";
		}
		return this.createCell(className, "&nbsp;", style);
	},

	addStatusIndicatorCell: function (item) {
		let className = "";
		let innerHTML = "&nbsp;"
		let style = "";

		if (item.status.status !== null) {
			style += "background-color: " + item.status.color + ";";
			className += "status ";
		}
		if (this.config.includeTextInStatusIndicatorCell) {
			innerHTML = item.status.status;
			const words = innerHTML.split(" ");

			//Capitalize the first letter of every word
			for (let i = 0; i < words.length; i++) {
				words[i] = words[i][0].toUpperCase() + words[i].substr(1);
			}

			innerHTML = "<span class='bgText'>" + words.join(" ") + "</span>";
		} else {
			className += "statusNoText ";
		}

		return this.createCell(className, innerHTML, style)
	},

	//Add Type Cell depending on input. Uses Custom Field
	addTypeCell: function (item, typeName) {
		let typeValIndex = 0;
		let typeValColor = "#00000000";
		let typeValName = "N/A";

		for (let i = 0; i < item.custom_fields.length; i++) {
			if (item.custom_fields[i].name.toUpperCase() === typeName.toUpperCase())
				typeValIndex = i;
		}

		if (item.custom_fields[typeValIndex].value !== undefined) {
			typeValName = item.custom_fields[typeValIndex].type_config.options[item.custom_fields[typeValIndex].value].name;
			typeValColor = item.custom_fields[typeValIndex].type_config.options[item.custom_fields[typeValIndex].value].color;
		}

		let innerHTML = "<span class='bgText'>" + typeValName + "</span>";
		let style = "background-color: " + typeValColor + ";";

		return this.createCell("", innerHTML, style);
	},
	////#endregion

	//#region HTML & Wrapper Creation
	//Ran when updating HTML of Module
	getDom: function () {
		let wrapper = document.createElement('div');

		if (this.config.debug) Log.trace("GetDom() Called", this);

		//If not loaded return loading screen.
		if (!loaded) {
			wrapper.innerHTML = "Loading...";
			return wrapper;
		}

		//Create Container containing the main table
		let divTable = document.createElement("div");
		divTable.className = "divTable normal small light";

		//Create table that contains all of the Task Data
		let divBody = document.createElement("table");
		divBody.className = "divTableBody";

		//If there are no tasks then return empty wrapper(HTML).
		if (this.tasks === undefined) {
			return wrapper;
		}

		//Insert subtasks below their parent tasks
		this.tasks.parents.forEach(item => {
			if (this.config.debug) Log.trace("Parent: " + item.name + " | " + item.parent + "<--(Parent's ID)", this);

			let index = null;

			for (let i = 0; i < this.tasks.items.length; i++) {
				if (this.tasks.items[i].id === item.parent)
					index = i;
			}

			//If parent task is submitted, then subtasks shouldn't be added; If we can't find the index for the parent of our subtask, then we can ignore them.
			if (this.tasks.items[index].status.status !== this.config.completedStatus && index !== null)
				this.tasks.items.splice(index + 1, 0, item);
		});

		//Also creating everything we need to show our tasks.
		this.tasks.items.forEach(item => {
			if (this.config.debug) Log.trace("Item: " + item.name + " | " + item.id, this);

			//Create Row holding individual Task Data
			let divRow = document.createElement("tr");
			divRow.className = "divTableRow";

			//Check if task is submitted or not yet, if so strikethrough the task name.
			if (item.status.status === this.config.completedStatus || item.status.status === this.config.crossedOffStatuses[0]) {
				divRow.className += " strikethrough"
				divRow.style.filter = "brightness(50%) grayscale(100%)";
			}

			//For every Task, we will see if it has reached the Start Date yet, and if not then they will not be displayed
			if (this.config.dontShowUntilStartDate) {
				if (item.start_date !== null) {
					const oneDay = 24 * 60 * 60 * 1000;
					let startDateTime = new Date(parseInt(item.start_date));
					let startDate = new Date(startDateTime.getFullYear(), startDateTime.getMonth(), startDateTime.getDate());
					let now = new Date();
					let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
					let diffDays = Math.floor((startDate - today) / (oneDay));
					if (this.config.debug) Log.trace("Diff Days: " + item.name + " | " + diffDays, this);

					if (diffDays > 0) {
						return;
					}
				} else { //If a SubTasks parent task isn't started yet, then don't show any of the subtasks either.
					let index = null;

					for (let i = 0; i < this.tasks.items.length; i++) {
						if (this.tasks.items[i].id === item.parent)
							index = i;
					}

					if (index !== null) {
						const oneDay = 24 * 60 * 60 * 1000;
						let startDateTime = new Date(parseInt(this.tasks.items[index].start_date));
						let startDate = new Date(startDateTime.getFullYear(), startDateTime.getMonth(), startDateTime.getDate());
						let now = new Date();
						let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
						let diffDays = Math.floor((startDate - today) / (oneDay));
						if (this.config.debug) Log.trace("Diff Days (Parent): " + item.name + " | " + diffDays, this);

						if (diffDays > 0) {
							return;
						}
					}
				}
			}

			//Add Priority Cell
			divRow.appendChild(this.addPriorityIndicatorCell(item));

			//Add Status Cell (No Text)
			if (!this.config.includeTextInStatusIndicatorCell) {
				divRow.appendChild(this.addStatusIndicatorCell(item));
			}

			//Make Subtasks have extra spacer cell, to make them look like subtasks
			divRow.appendChild(this.addColumnSpacerCell());
			if (item.parent !== null) {
				divRow.appendChild(this.addColumnSubSpacerCell());
			}

			//Add Title Cell
			divRow.appendChild(this.addTitleCell(item));

			//Add Status with Text Cell
			if (this.config.includeTextInStatusIndicatorCell) {
				divRow.appendChild(this.addStatusIndicatorCell(item));
			}

			//If debugging then show the possible task types.
			if (this.config.debug) Log.trace("Possible Task Types: " + this.getPossibleTaskTypes(), this);

			//Use Task Types from config in order to add the Type Columns you desire.
			let taskTypes = Object.values(this.config.taskTypes);

			taskTypes.forEach(type => {
				divRow.appendChild(this.addTypeCell(item, type));
			});

			//Add Due Date Cell
			divRow.appendChild(this.addDueDateCell(item));

			//Make sure there are no duplicates being made
			let arr = Array.from(divBody.children);
			if (arr.includes(divRow)) return;

			//Add the Row with the Individual Task Data to the Table
			divBody.appendChild(divRow);
		});

		//Add the Table to the main HTML content
		divTable.appendChild(divBody);
		wrapper.appendChild(divTable);

		//Return all of our HTML
		return wrapper;
	},
	//#endregion

	//Return the possible Task Types (Custom Fields)
	getPossibleTaskTypes: function () {
		let typesList = "";

		this.tasks.items[0].custom_fields.forEach(field => {
			typesList += field.name + ", ";
		});

		return typesList;
	}
});
