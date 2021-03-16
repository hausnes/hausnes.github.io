var request = new XMLHttpRequest();
request.open('GET', 'https://randomuser.me/api/?results=30', true);

request.onload = function () {
	// Begin accessing JSON data here
	var data = JSON.parse(this.response);
	if (request.status >= 200 && request.status < 400) {
		data.forEach((brukar) => {
            console.log(brukar.name.title + " " + brukar.name.last);
  	})
  	} else {
		console.log("Feilmelding!");
  	}
}

request.send();