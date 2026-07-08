import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { UpdateNickname } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";

const CreateProfilePage = () => {
  const [nickname, setNickname] = useState('');
  const { userData, currentUser } = useAuth();
  const navigate = useNavigate();

  const profileImages = [
    "/0.png",
    "/1.png",
    "/2.png",
    "/3.png",
    "/4.png",
    "/5.png",
    "/6.png",
    "/7.png",
  ];

  const [selectedImage, setSelectedImage] = useState(profileImages[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (nickname === "") {
      toast.error("Nickname cannot be blank");
      return;
    }

    if (nickname.length > 12) {
      toast.error("Nickname should be less than 12 characters");
      return;
    }

    if (currentUser) {
      try {
        await UpdateNickname(currentUser.uid, nickname, selectedImage);
        toast.success("Profile created successfully!");
        navigate('/home');
      } catch (error) {
        toast.error("Failed to update profile");
        console.error(error);
      }
    } else {
      console.warn("No user is signed in.");
    }
  };

  useEffect(() => {
    if (userData && userData.nickName !== "") {
      navigate("/home");
    }
  }, [userData, navigate]);

  return (
    <div className="fixed flex background left-0 top-0 items-center justify-center w-full h-full">
      <div className="flex w-full max-w-md flex-col justify-center px-8 py-10 bg-white border border-gray-200 rounded-3xl shadow-2xl">
        <h3 className="mb-6 text-center text-3xl font-extrabold tracking-tight text-[var(--primary-bg)]">
          Create Your Profile
        </h3>

        <div className="flex flex-col items-center relative">
          <div className="w-32 h-32 mb-4 rounded-full bg-gray-200 flex items-center justify-center shadow-md border-4 border-[var(--tertiary-bg)] relative">
            <img
              src={selectedImage}
              alt="Selected Profile"
              className="w-full h-full object-cover rounded-full"
            />
          </div>

          <div className="mb-6">
            <div className="grid grid-cols-4 gap-3">
              {profileImages.slice(0, 4).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`profile-${idx}`}
                  className={`w-14 h-14 rounded-full cursor-pointer border-4 transition-all duration-200 shadow-sm hover:scale-105 ${selectedImage === img ? "border-[var(--tertiary-bg)] ring-2 ring-[var(--primary-bg)]" : "border-gray-200"}`}
                  onClick={() => setSelectedImage(img)}
                  draggable={false}
                />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-3 mt-3">
              {profileImages.slice(4, 8).map((img, idx) => (
                <img
                  key={idx + 4}
                  src={img}
                  alt={`profile-${idx + 4}`}
                  className={`w-14 h-14 rounded-full cursor-pointer border-4 transition-all duration-200 shadow-sm hover:scale-105 ${selectedImage === img ? "border-[var(--tertiary-bg)] ring-2 ring-[var(--primary-bg)]" : "border-gray-200"}`}
                  onClick={() => setSelectedImage(img)}
                  draggable={false}
                />
              ))}
            </div>
          </div>

          <input
            type="text"
            placeholder="Enter your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            className="mb-5 px-5 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 text-center text-lg shadow"
          />

          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-[var(--secondary-bg)] text-white rounded-full font-semibold shadow hover:bg-[var(--primary-bg)] transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProfilePage;
