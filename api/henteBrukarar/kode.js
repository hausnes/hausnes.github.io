// https://randomuser.me/api/?results=5
	
let brukarar = [];
	
const getUsers = async () => { // async
    const response = await fetch("https://randomuser.me/api/?results=30"); // await
    const json = await response.json(); // await
    users = json.results;
    // return users;
    skrivUt(users);
}
 
getUsers();

function skrivUt(dataInn) {
    console.log(typeof(dataInn));
    console.log(dataInn);
    console.log(dataInn[0]);

    for(let user of users) {
        console.log(user.name.title + " " + user.name.last);
    }
}