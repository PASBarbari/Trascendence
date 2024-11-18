import "./index.css";

export default function Button({ onclick, text, type, className })
{
  return (
    <button className={`button ${className}`} onClick={onclick} type={type}>
      {text}
    </button>
  );
}
