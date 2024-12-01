import React, { useState, useEffect, useRef } from "react";
import "./Profile.css";
import { TextField } from "@mui/material";
import { Pencil, Save } from 'lucide-react';

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

  const formRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (formRef.current) {
        if (formRef.current.offsetWidth < 600) {
          formRef.current.classList.add('column');
        } else {
          formRef.current.classList.remove('column');
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const GetProfile = async () => {
      const userID = localStorage.getItem("user_id");
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
          const { first_name, last_name, birth_date, bio } = data;
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

  useEffect(() => {
    if (edit) {
      setTempName(name);
      setTempSurname(surname);
      setTempBirthdate(birthdate);
      setTempBio(bio);
    }
  }, [edit, name, surname, birthdate, bio]);

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

    setEdit(false);
  };

  return (
    <div className="profile-card">
      <div className="profile-card-content">
        <div className="profile-card-details">
          <form onSubmit={handleSave} className={`profile-form ${formRef.current && formRef.current.classList.contains('column') ? 'column' : ''}`} ref={formRef}>
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
          </form>
        </div>
        <div className="profile-card-image-container">
          <div className="profile-image-circle">
            {/*<img src="/placeholder.svg" alt="Profile" className="profile-card-image" />*/}
          </div>
		  <div className="buttons">
			<button onClick={() => setEdit(!edit)} className="edit-button">
				<Pencil className="edit-icon" />
			</button>
			<button onClick={handleSave} className="save-button">
				<Save className="save-icon" />
			</button>
		  </div>
        </div>
      </div>
    </div>
  );
}