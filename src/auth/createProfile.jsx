import React, { useState ,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';

const CreateProfile = () => {
  const [nickName,setNickname] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);

  const navigate = useNavigate();

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) setProfilePhoto(file);
};

  const handleSubmit = async (e) => {
    e.preventDefault();
  };

  return (
    <div className="flex items-center justify-center min-h-100">
        <div className="flex min-h-full flex-col justify-center px-6 py-8 lg:px-8 bg-white border border-gray-300 rounded-2xl shadow-md">
            <h2 className="mt-1 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
                Create Your Profile
            </h2>
        </div>
    </div>
  );
};

export default CreateProfile;
