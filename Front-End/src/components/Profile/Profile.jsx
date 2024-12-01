import React, { useState, useEffect } from "react";
import propic from "./propic.jpeg";
import "./Profile.css";
import Button from "../Button/Button";
import { TextField } from "@mui/material";
import { Pencil } from 'lucide-react';

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
  const user_id = localStorage.getItem("user_id");
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
    <div className="profile-card">
      <div className="profile-card-content">
        <div className="profile-card-image-container">
          <img src="/placeholder.svg" alt="Profile" className="profile-card-image" />
          <button onClick={() => setEdit(!edit)} className="edit-button">
            <Pencil className="edit-icon" />
          </button>
        </div>
        <div className="profile-card-details">
          <form onSubmit={handleSave} className="profile-form">
            <div className="profile-form-group">
              <TextField
                label="Username"
                type="text"
                name="username"
                value={username}
                InputProps={{
                  readOnly: true,
                  style: { height: 40, border: 'none' }
                }}
                variant="outlined"
                fullWidth
                className="readonly-input"
              />
            </div>
			<div className="profile-form-group">
              <TextField
                label="User ID"
                type="text"
                name="user_id"
                value={user_id}
                InputProps={{
                  readOnly: true,
                  style: { height: 40, border: 'none' }
                }}
                variant="outlined"
                fullWidth
                className="readonly-input"
              />
            </div>
            <div className="profile-form-group">
              <TextField
                label="Email"
                type="email"
                name="email"
                value={email}
                InputProps={{
                  readOnly: true,
                  style: { height: 40, border: 'none' }
                }}
                variant="outlined"
                fullWidth
                className="readonly-input"
              />
            </div>
            <div className="profile-form-group">
              <TextField
                label="Nome"
                type="text"
                name="name"
                value={edit ? tempName : name}
                onChange={(e) => setTempName(e.target.value)}
                InputProps={{
                  readOnly: !edit,
                  style: { height: 40, border: !edit ? 'none' : '' }
                }}
                variant="outlined"
                fullWidth
                className={!edit ? "readonly-input" : ""}
              />
            </div>
            <div className="profile-form-group">
              <TextField
                label="Cognome"
                type="text"
                name="surname"
                value={edit ? tempSurname : surname}
                onChange={(e) => setTempSurname(e.target.value)}
                InputProps={{
                  readOnly: !edit,
                  style: { height: 40, border: !edit ? 'none' : '' }
                }}
                variant="outlined"
                fullWidth
                className={!edit ? "readonly-input" : ""}
              />
            </div>
            <div className="profile-form-group">
              <TextField
                label="Data di nascita"
                type="date"
                name="birthdate"
                value={edit ? tempBirthdate : birthdate}
                onChange={(e) => setTempBirthdate(e.target.value)}
                InputProps={{
                  readOnly: !edit,
                  style: { height: 40, border: !edit ? 'none' : '' }
                }}
                variant="outlined"
                fullWidth
                className={!edit ? "readonly-input" : ""}
              />
            </div>
            <div className="profile-form-group">
              <TextField
                label="Bio"
                type="text"
                name="bio"
                value={edit ? tempBio : bio}
                onChange={(e) => setTempBio(e.target.value)}
                InputProps={{
                  readOnly: !edit,
                  style: { height: 40, border: !edit ? 'none' : '' }
                }}
                variant="outlined"
                fullWidth
                className={!edit ? "readonly-input" : ""}
              />
            </div>
            {edit && (
              <div className="profile-form-group">
                <Button type="submit">Salva Modifiche</Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}