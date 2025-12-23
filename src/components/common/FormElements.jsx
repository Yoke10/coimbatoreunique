import React from 'react';

export const InputGroup = ({ label, name, value, onChange, type = "text", placeholder, error, icon, required }) => {
    return (
        <div className="input-group">
            {label && <label className="input-label" htmlFor={name}>{label} {required && '*'}</label>}
            <div className="input-wrapper">
                {icon && (
                    <span className="input-icon">
                        {icon}
                    </span>
                )}
                <input
                    type={type}
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    required={required}
                    className={`form-input ${error ? 'error' : ''}`}
                    placeholder={placeholder}
                />
            </div>
            {error && <span className="error-text">{error}</span>}
        </div>
    );
};

export const SelectGroup = ({ label, name, value, onChange, options, error, icon, required, placeholder = "Select Option" }) => {
    return (
        <div className="input-group">
            {label && <label className="input-label" htmlFor={name}>{label} {required && '*'}</label>}
            <div className="input-wrapper">
                {icon && (
                    <span className="input-icon">
                        {icon}
                    </span>
                )}
                <select
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    required={required}
                    className={`form-select ${error ? 'error' : ''}`}
                >
                    <option value="">{placeholder}</option>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            {error && <span className="error-text">{error}</span>}
        </div>
    );
};

export const TextAreaGroup = ({ label, name, value, onChange, placeholder, error, required }) => {
    return (
        <div className="input-group">
            {label && <label className="input-label" htmlFor={name}>{label} {required && '*'}</label>}
            <textarea
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                className={`form-textarea ${error ? 'error' : ''}`}
                placeholder={placeholder}
            />
            {error && <span className="error-text">{error}</span>}
        </div>
    );
};
