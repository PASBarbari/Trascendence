import React, { useState, useEffect } from "react";
import propic from "./propic.jpeg";
import "./Profile.css";
import Input from "../Input/Input";
import Button from "../Button/Button";

const PostProfile = async (name, surname, birthdate, bio) => {
  const userID = localStorage.getItem("user_id");

  try {
    const response = await fetch("http://localhost:8002/user/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_id: userID,
        first_name: name,
        last_name: surname,
        birth_date: birthdate,
        bio: bio,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Profile:", data);
    } else {
      const errorData = await response.json();
      console.error("Errore nella risposta del server:", errorData);
    }
  } catch (error) {
    console.error("Errore nella richiesta:", error);
  }
};

const PatchProfile = async (name, surname, birthdate, bio) => {
	const userID = localStorage.getItem("user_id");

	try {
		const response = await fetch(`http://localhost:8002/user/user/${userID}/`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				account_id: userID,
				first_name: name,
				last_name: surname,
				birth_date: birthdate,
				bio: bio,
			}),
		});

		if (response.ok) {
			const data = await response.json();
			console.log("Profile:", data);
		} else {
			const errorData = await response.json();
			console.error("Errore nella risposta del server:", errorData);
		}
	} catch (error) {
		console.error("Errore nella richiesta:", error);
	}
};


export default function Profile() {
  const username = localStorage.getItem("user_username");
  const email = localStorage.getItem("user_email");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [bio, setBio] = useState("");
  const [edit, setEdit] = useState(false);

  const [tempName, setTempName] = useState("");
  const [tempSurname, setTempSurname] = useState("");
  const [tempBirthdate, setTempBirthdate] = useState("");
  const [tempBio, setTempBio] = useState("");

  useEffect(() => {
    if (edit) {
      setTempName(name);
      setTempSurname(surname);
      setTempBirthdate(birthdate);
      setTempBio(bio);
    }
  }, [edit, name, surname, birthdate]);

  const handleSave = (e) => {
    e.preventDefault();
    setName(tempName);
    setSurname(tempSurname);
    setBirthdate(tempBirthdate);
    setBio(tempBio);

    localStorage.setItem("name", tempName);
    localStorage.setItem("surname", tempSurname);
    localStorage.setItem("birthdate", tempBirthdate);
    localStorage.setItem("bio", tempBio);
		PatchProfile(tempName, tempSurname, tempBirthdate, tempBio);
    //PostProfile(tempName, tempSurname, tempBirthdate, tempBio);

    setEdit(false);
  };

	useEffect(() => {

		const GetProfile = async () => {
				const userID = localStorage.getItem("user_id");
				console.log("userID", userID);
				console.log(`http://localhost:8002/user/user/${userID}/`);
				try {
					const response = await fetch(`http://localhost:8002/user/user/${userID}/`, {
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							// "X-CSRFToken": getCookie("csrftoken"),
							"Authorization": `Bearer ${localStorage.getItem("token")}`,
						},
					});
			
					if (response.ok) {
						const data = await response.json();
						console.log("Profile:", data);
						const { first_name, last_name, birth_date, bio } = data;
						console.log("first_name", first_name);
						setName(first_name);
						setSurname(last_name);
						setBirthdate(birth_date);
						setBio(bio);
					} else {
						const errorData = await response.json();
						console.error("Errore nella risposta del server:", errorData);
					}
				} catch (error) {
					console.error("Errore nella richiesta:", error);
				}
			};
			GetProfile();
		
	}, []);

  return (
    <div className="profile">
      <div className="profile-text">
        <p>user: {username}</p>
        <p>email: {email}</p>
        {edit ? (
          <>
            <Input
              type="text"
              name="name"
              placeholder="name"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
            />
            <Input
              type="text"
              name="surname"
              placeholder="surname"
              value={tempSurname}
              onChange={(e) => setTempSurname(e.target.value)}
            />
            <Input
              type="date"
              name="birthdate"
              className="date_input"
              value={tempBirthdate}
              onChange={(e) => setTempBirthdate(e.target.value)}
            />
            <Input
              type="text"
              name="bio"
              placeholder="bio"
              value={tempBio}
              onChange={(e) => setTempBio(e.target.value)}
            />
            <button onClick={handleSave}>Save</button>
          </>
        ) : (
          <>
            <p>name: {name}</p>
            <p>surname: {surname}</p>
            <p>birthdate: {birthdate}</p>
            <p>bio: {bio}</p>
          </>
        )}
        <button onClick={() => setEdit(!edit)}>
          {edit ? "Cancel" : "Edit"}
        </button>
      </div>
      <img src={propic} alt="propic" className="profile-image" />
    </div>
  );
}
