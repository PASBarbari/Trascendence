import './Input.css';

export default function Input({ type, name, placeholder, value, onChange, className }) {
  return (
    <input
      className={`input ${className}`}
      type={type}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  );
}