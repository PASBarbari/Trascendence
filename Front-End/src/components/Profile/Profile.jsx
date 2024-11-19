import React from "react";
import propic from "./propic.jpeg";
import "./Profile.css";
import Input from "../Input/Input";
import Button from "../Button/Button";

//TODO add this to backend

export default function Profile() {
  const username = localStorage.getItem("user_username");
  const email = localStorage.getItem("user_email");
  const [name, setName] = React.useState("");
  const [surname, setSurname] = React.useState("");
  const [birthdate, setBirthdate] = React.useState("");

  const [tempName, setTempName] = React.useState("");
  const [tempSurname, setTempSurname] = React.useState("");
  const [tempBirthdate, setTempBirthdate] = React.useState("");

  const handleNameSubmit = (e) => {
    e.preventDefault();
    setName(tempName);
  };

  const handleSurnameSubmit = (e) => {
    e.preventDefault();
    setSurname(tempSurname);
  };

  const handleBirthdateSubmit = (e) => {
    e.preventDefault();
    setBirthdate(tempBirthdate);
  };

  return (
    <div className="profile">
      <div className="profile-text">
        <p>user: {username}</p>
        <p>email: {email}</p>
        {name ? (
          <p>name: {name}</p>
        ) : (
          <form onSubmit={handleNameSubmit} className="profile-input">
            <Input
              type="text"
              name="name"
              placeholder="name"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
            />
						<Button text="Submit" type="submit" />
          </form>
        )}
        {surname ? (
          <p>surname: {surname}</p>
        ) : (
          <form onSubmit={handleSurnameSubmit} className="profile-input">
            <Input
              type="text"
              name="surname"
              placeholder="surname"
              value={tempSurname}
              onChange={(e) => setTempSurname(e.target.value)}
            />
            <Button text="Submit" type="submit" />
          </form>
        )}
        {birthdate ? (
          <p>birthdate: {birthdate}</p>
        ) : (
          <form onSubmit={handleBirthdateSubmit} className="profile-input">
            <Input
              type="date"
              name="birthdate"
              className="date_input"
              value={tempBirthdate}
              onChange={(e) => setTempBirthdate(e.target.value)}
            />
            <Button text="Submit" type="submit" />
          </form>
        )}
      </div>
      <img src={propic} alt="propic" className="profile-image" />
    </div>
  );
}