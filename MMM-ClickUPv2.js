/* Magic Mirror Module
 * By: Andrew Matayka
 * Module: MMM-ClickUPv2
 * Version: 0.01
 */
let receivedToken = false;
let loaded = false;

//NEW LOG FUNCTION
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

	error: function (message) {
		console.log("%cError: " + message, "color: red");
	},

	error: function (message, that) {
		console.log("%c" + that.name + " - Error: " + message, "color: red");
	},

	table: function (message) {
		console.table(message);
	}
};

Module.register("MMM-ClickUPv2", {
	//Default Config Values
	defaults: {
		updateInterval: 60 * 1000, //How often module is updated: (Min * Sec * Ms) = Every 60 Seconds

		taskTypes: ["Class", "Type"], //The Task Types you want to be shown (Custom Fields)
		highlightedTaskTypes: ["Class"], //The highlighted Task Type for Custom Fields
		completedStatus: "submitted", //Name of the status used to mark completion
		maxCompletedTaskCount: 3, //The max amount of shown completed tasks

		clientID: "CZ2CGOL98DNVSMP4O4T3YN26L7E4E4VR",
		clientSecret: "2YFBQZPOZ47OZGEAORT8LYFHX6ICILIJD8CIPZFBMMIY8O48QL29ZDAJ6REN4E12",
		accessCode: "40R1Z3TX3EYQ9HW1VSZBMM1EMX3MJNH2",

		accessToken: "", //Access Token required for authorization of API

		debug: false,
	},

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

	//Ran at start of module
	start: function () {
		if (this.config.debug) {
			Log.trace("Getting Styles: " + this.getStyles(), this);
		}

		Log.trace("Starting Module", this);
		const self = this; //Set variable self to this object

		//Need to check if we already have Access Token. If not we need to acquire it.
		if (this.config.accessToken !== null && this.config.accessToken !== undefined && this.config.accessToken !== "") {
			//We have Access Token
			if (this.config.debug) Log.trace("Found Access Token: " + this.config.accessToken, this);
		} else {
			//Send request to get Access Token
			if (this.config.debug) Log.trace("Requesting Access Token", this);
			this.sendSocketNotification('Request_AccessToken', this.config); //Request Access Token from Node Helper
		}

		let interId = setInterval(() => {
			if (receivedToken !== true && (this.config.accessToken === "" || this.config.accessToken === null || this.config.accessToken === undefined)) {
				loaded = false;
				if (this.config.debug) Log.trace("Access Token Not Available Yet", this);
			} else {
				loaded = true;
				if (this.config.debug) Log.trace("Access Token Available!", this);
				this.continueStart();
				clearInterval(interId);
			}
		}, 50);
	},

	//Ran when Access Token is found and we can continue startup
	continueStart: function () {
		const self = this;

		//Run Code Here to Fetch first tasks list, then interval to keep requesting tasks list.
		self.sendSocketNotification('Request_TasksList', this.config); //Request Access Token from Node Helper

		setInterval(function () {
			self.sendSocketNotification('Request_TasksList', this.config); //Request Access Token from Node Helper
		}, this.config.updateInterval);
	},

	//Ran on suspension of module
	suspend: function () {

	},

	//Ran on resume of module
	resume: function () {

	},

	//Ran when receiving notification from System or other Modules
	notificationReceived: function (notification, payload, sender) {

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

	filterTasksList: function (tasks) {
		let submittedCount = 0;

		//Reset the list each run to not make duplicates
		if (this.tasks !== undefined) {
			if (this.tasks.items.length > 0 || this.tasks.parents.length > 0) {
				this.tasks.items.length = 0;
				this.tasks.parents.length = 0;
			}
		}

		const self = this; //Setting self so we have a localized instance
		let items = []; //Array of individual tasks that dont have parents
		let parents = []; //Array of individual tasks that have parents

		//Log tasks to a table if debug is enabled
		if (this.config.debug) Log.table(tasks);

		//Push every task into the array of items so we can access tasks individually.
		for (let i = 0; i < tasks.length; i++) {
			if (tasks[i].parent === null || tasks[i].parent === "" || tasks[i].parent === undefined) {
				if (tasks[i].status.status !== this.config.completedStatus || submittedCount < this.config.maxCompletedTaskCount) {
					items.push(tasks[i]);
					if (tasks[i].status.status === this.config.completedStatus) submittedCount++;
				}
			} else {
				parents.push(tasks[i]);
			}
		}

		this.tasks = {
			"items": items,
			"parents": parents
		}

		self.updateDom();
	},

	//#region CreateCellTypes
	createCell: function (className, innerHTML) {
		let cell = document.createElement("td");
		cell.className = "divTableCell " + className;
		cell.innerHTML = innerHTML;

		if (cell.className.includes("title")) {
			if (innerHTML.includes("-->")) {
				cell.colSpan = 1;
			} else {
				cell.colSpan = 2;
			}
		}

		return cell;
	},

	//Add suffix to date depending on the day. {st, nd, rd, th}
	dateOrdinal: function (d) {
		return d + (31 === d || 21 === d || 1 === d ? "st" : 22 === d || 2 === d ? "nd" : 23 === d || 3 === d ? "rd" : "th");
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
				function formatTime(d) {
					function z(n) {
						return (n < 10 ? "0" : "") + n;
					}

					let h = d.getHours();
					let m = z(d.getMinutes());
					if (config.timeFormat === 12) {
						return " " + (h % 12 || 12) + ":" + m + (h < 12 ? " AM" : " PM");
					} else {
						return " " + h + ":" + m;
					}
				}

				innerHTML += " @ " + formatTime(dueDateTime);
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
		if (item.parent !== null) {
			item.name = "--> " + item.name;
		}

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
		if (item.priority !== null) {
			switch (parseInt(item.priority.id)) {
				case 1:
					className += "priority1";
					break;
				case 2:
					className += "priority2";
					break;
				case 3:
					className += "priority3";
					break;
				case 4:
					className += "priority4";
					break;
				default:
					className = "";
					break;
			}
		} else {
			className += "priority1";
		}
		return this.createCell(className, "&nbsp;");
	},

	//Add Type Cell depending on input. Uses Custom Field
	addTypeCell: function (item, typeName, highlightedType) {
		let typeValIndex = 0;
		let typeValName = "N/A";
		let typeValColor = null;

		let count = 0;
		item.custom_fields.forEach(field => {
			if (field.name.toUpperCase() === typeName.toUpperCase()) {
				typeValIndex = count;
			}
			count++;
		});

		if (item.custom_fields[typeValIndex].value !== undefined) {
			typeValName = item.custom_fields[typeValIndex].type_config.options[item.custom_fields[typeValIndex].value].name;
			typeValColor = item.custom_fields[typeValIndex].type_config.options[item.custom_fields[typeValIndex].value].color;
		}

		let innerHTML = "";
		if (highlightedType === false) {
			innerHTML = "<span style='color: " + typeValColor + ";'>" + typeValName + "</span>";
		} else {
			innerHTML = "<span class='projectcolor' style='color: " + typeValColor + "; background-color: " + typeValColor + "'></span>" + typeValName;
		}

		return this.createCell("xsmall", innerHTML);
	},
	////#endregion

	//Ran when updating HTML of Module
	getDom: function () {
		let wrapper = document.createElement('div');

		if (this.config.debug) Log.trace("Method GetDom Called", this);

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

			let index = null, count = 0;

			this.tasks.items.forEach(itemParents => {
				if (itemParents.id === item.parent) {
					index = count;
				}
				count++;
			});

			//If parent task is submitted, then subtasks shouldn't be added; If we can't find the index for the parent of our subtask, then we can ignore them.
			if (index !== null) {
				if (this.tasks.items[index].status.status !== this.config.completedStatus) {
					this.tasks.items.splice(index + 1, 0, item)
				}
			}
		});

		this.tasks.items.forEach(item => {
			if (this.config.debug) Log.trace("Item: " + item.name + " | " + item.id, this);

			//Create Row holding individual Task Data
			let divRow = document.createElement("tr");
			divRow.className = "divTableRow";

			//Check if task is submitted or not yet, if so strikethrough the task name.
			if (item.status.status === this.config.completedStatus) {
				divRow.className += " strikethrough"
				divRow.style.filter = "brightness(50%) grayscale(100%)";
			}

			//Add Priority Cell
			divRow.appendChild(this.addPriorityIndicatorCell(item));

			//Add Status Indicator Cell
			//divRow.appendChild(this.addStatusIndicatorCell(item, ""));

			//Make Subtasks have extra spacer cell, to make them look like subtasks
			divRow.appendChild(this.addColumnSpacerCell());
			if (item.parent !== null) {
				divRow.appendChild(this.addColumnSubSpacerCell());
			}

			//Add Title Cell
			divRow.appendChild(this.addTitleCell(item));

			//Add Due Date Cell
			divRow.appendChild(this.addDueDateCell(item));

			//Spacing
			divRow.appendChild(this.addColumnSpacerCell());

			//If debugging then show the possible task types.
			if (this.config.debug) Log.trace("Possible Task Types: " + this.getPossibleTaskTypes(), this);

			//Use Task Types from config in order to add the Type Columns you desire.
			let taskTypes = Object.values(this.config.taskTypes);
			let highlightedTaskTypes = Object.values(this.config.highlightedTaskTypes);

			taskTypes.forEach(type => {
				highlightedTaskTypes.forEach(high => {
					if (type === high) {
						divRow.appendChild(this.addTypeCell(item, type, true));
					} else {
						divRow.appendChild(this.addTypeCell(item, type, false));
					}
				})
			});

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

	//Return the possible Task Types (Custom Fields)
	getPossibleTaskTypes: function () {
		let typesList = "";

		this.tasks.items[0].custom_fields.forEach(field => {
			typesList += field.name + ", ";
		});

		return typesList;
	}
});
