var db = firebase.firestore();
var storageRef = firebase.storage().ref();
let songFile = null;
let imageFile = null;
document.getElementById('select-song').addEventListener("change", e => {
    songFile = e.target.files[0];
});

document.getElementById('select-thumbnail').addEventListener("change", e => {
    imageFile = e.target.files[0];
    document.getElementById('thumbnail-preview').src = URL.createObjectURL(imageFile);
});

const showTable = () =>{
    const uid = prompt("Please enter your UID");
    let flag = false;
    if (uid != null) {
        db.collection('admins').get().then(res =>{
            const data = res.docs.map(doc => doc.data());
            data.forEach(ele=>{
                if(ele.uid==uid){
                    document.getElementById('table_div').style.display = 'block';
                    flag = true;
                }
            })

            if(!flag){
                alert("UID did not matched!");
                document.getElementById('user').checked = true;
            }
        })
    }else{
        alert('Not Authorized!')
        document.getElementById('user').checked = true;
    }

    
}
const hideTable = () =>{
    document.getElementById('table_div').style.display = 'none';
}

const deleteMusic = (event) => {

    let proceed = confirm("Are you sure you want to Delete?");
    if (proceed) {
        document.getElementById(event.id).parentElement.innerHTML = `
        <div class="spinner-border text-danger" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>`

    const musicId = event.id.substring(2);
    var musicThumbRef = storageRef.child('thumbnail/' + musicId + '.jpg');
    musicThumbRef.delete().then(() => {
        var musicRef = storageRef.child('music/' + musicId + '.mp3');
        musicRef.delete().then(() => {
            db.collection("music").doc(musicId).delete()
                .then(() => {
                    loadTable();
                })
        })
    });
    
    } else {
        console.log('You denied')
    }
    
    
}

const verify = (event) =>{
    let proceed = confirm("Are you sure you want to VERIFY?");
    if (proceed) {
        console.log('Good to proceed');
        let musicID = event.id.substring(12)
        console.log(musicID);
        db.collection("music").doc(musicID).update({
            verified: true
        }).then(function() {
            loadTable();
          });
    } else {
        console.log('You denied')
    }
}

const unverify = (event) =>{
    let proceed = confirm("Are you sure you want to UNVERIFY?");
    if (proceed) {
        console.log('Good to proceed');
        let musicID = event.id.substring(10)
        console.log(musicID);
        db.collection("music").doc(musicID).update({
            verified: false
        }).then(function() {
            loadTable();
          });
    } else {
        console.log('You denied')
    }
}

const loadTable = async () => {
    document.getElementById('table-body').innerHTML = "";
    await fetch('https://us-central1-streamer-22d50.cloudfunctions.net/getMusic')
        .then(res => res.json())
        .then(data => {
            data.forEach((ele,index) => {   
                    document.getElementById('table-body')
                    .innerHTML += `
                    <tr>
                        <td style="width: 50px;">${index+1}</td>
                        <td>${ele.id}</td>
                        <td>${ele.title}</td>
                        <td class="mid"><a href=${ele.downloadUrl} target="_blank">Play</a></td>
                        <td><a href=${ele.imageUrl} target="_blank">Show image</a></td>
                        <td class="mid"><img style="cursor: pointer;" onclick="deleteMusic(${'ID'+ele.id})" src="bin.png" height="20" width="20" id=${'ID'+ele.id}></td>
                        <td class="mid"><img style="cursor: pointer;" onclick="unverify(${'verifiedID'+ele.id})" src="tick.png" height="20" width="20" id=${'verifiedID'+ele.id}> verified</td>
                    </tr>`
            })
        })

    db.collection('music').get().then(res =>{
        const data = res.docs.map(doc => doc.data())
        console.log('Total music:', data.length)
        let unverifiedMusic = data.filter(ele =>{
            return ele.verified===false
        })
        let sl = data.length - unverifiedMusic.length+1

        data.forEach((ele,index) =>{
            if(!ele.verified){
                document.getElementById('table-body')
                        .innerHTML += `
                        <tr>
                            <td style="width: 50px;">${sl++}</td>
                            <td>${res.docs[index].id}</td>
                            <td>${ele.title}</td>
                            <td class="mid"><a href=${ele.downloadUrl} target="_blank">Play</a></td>
                            <td><a href=${ele.imageUrl} target="_blank">Show image</a></td>
                            <td class="mid"><img style="cursor: pointer;" onclick="deleteMusic(${'ID'+res.docs[index].id})" src="bin.png" height="20" width="20" id=${'ID'+res.docs[index].id}></td>
                            <td class="mid"><img style="cursor: pointer;" onclick="verify(${'unverifiedID'+res.docs[index].id})" src="cross.png" height="20" width="20" id=${'unverifiedID'+res.docs[index].id}> unverified</td>
                        </tr>`
                }
            
        })
        sl = 0;
    })
}

loadTable();

const uploadSong = () => {

    const file = document.forms['myform']['select-song'].value;
    const title = document.forms['myform']['song-title'].value;
    const artist = document.forms['myform']['artist-name'].value;
    const genre = document.forms['myform']['select-genre'].value;
    if (file === '' || title === '' || artist === '' || !songFile || !imageFile) {
        return;
    }

    document.getElementById('myspinner').style.display = "block";
    document.getElementById('submit-button').style.display = "none";
    db.collection("music").add({
        title: title,
        genre: genre,
        artist: artist,
        uploadDate: new Date(),
        verified:false
    })
        .then((docRef) => {
            var songRef = storageRef.child('music/' + docRef.id + '.mp3');
            var upload = songRef.put(songFile);
            document.getElementById('upload-progress-cont').style.display = 'block';

            upload.on('state_changed', snapshot => {
                var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                document.getElementById('progress').innerHTML = 'Uploading music... (' + Math.floor(progress) + '%)';
            },
                error => {
                    //show error alert
                    var myAlert = document.getElementById('alert-toast-failed');
                    var bsAlert = new bootstrap.Toast(myAlert);
                    bsAlert.show();

                    //reset the form
                    document.getElementById('myspinner').style.display = "none";
                    document.getElementById('submit-button').style.display = "block";

                    document.getElementById('upload-progress-cont').style.display = 'none';
                },
                () => {
                    upload.snapshot.ref.getDownloadURL()
                        .then(downloadUrl => {
                            db.collection('music').doc(docRef.id)
                                .set({
                                    downloadUrl: downloadUrl
                                }, { merge: true })
                                .then(() => {

                                    var imageRef = storageRef.child('thumbnail/' + docRef.id + '.jpg');
                                    var uploadImage = imageRef.put(imageFile);
                                    uploadImage.on('state_changed', snapshot => {
                                        var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                        document.getElementById('progress').innerHTML = 'Uploading thumbnail... (' + Math.floor(progress) + '%)';
                                    },
                                        error => {
                                            //show error alert
                                            var myAlert = document.getElementById('alert-toast-failed');
                                            var bsAlert = new bootstrap.Toast(myAlert);
                                            bsAlert.show();

                                            //reset the form
                                            document.getElementById('myspinner').style.display = "none";
                                            document.getElementById('submit-button').style.display = "block";

                                            document.getElementById('upload-progress-cont').style.display = 'none';
                                        },
                                        () => {
                                            uploadImage.snapshot.ref.getDownloadURL()
                                                .then(url => {
                                                    db.collection('music').doc(docRef.id)
                                                        .set({
                                                            imageUrl: url
                                                        }, { merge: true })
                                                })
                                                .then(() => {
                                                    //show success alert
                                                    var myAlert = document.getElementById('alert-toast-success');
                                                    var bsAlert = new bootstrap.Toast(myAlert);
                                                    bsAlert.show();

                                                    //reset the form
                                                    document.getElementById('myform').reset();
                                                    document.getElementById('myspinner').style.display = "none";
                                                    document.getElementById('submit-button').style.display = "block";
                                                    document.getElementById('thumbnail-preview').src = '';
                                                    document.getElementById('upload-progress-cont').style.display = 'none';

                                                    // update table

                                                    loadTable();
                                                })
                                        });
                                });
                        })
                });

        })
        .catch((error) => {
            //show error alert
            var myAlert = document.getElementById('alert-toast-failed');
            var bsAlert = new bootstrap.Toast(myAlert);
            bsAlert.show();

            //reset the form
            document.getElementById('myspinner').style.display = "none";
            document.getElementById('submit-button').style.display = "block";

            document.getElementById('upload-progress-cont').style.display = 'none';
        });

}