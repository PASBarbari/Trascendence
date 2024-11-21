import "./Button.css";

export default function Button({ onclick, text, type, className, image })
{
  return (
    <button className={`button ${className || ''}`} onClick={onclick} type={type}>
      {image}
	  {text}
    </button>
  );
}
