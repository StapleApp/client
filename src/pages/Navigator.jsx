import { BsGearFill } from "react-icons/bs";
import { FaStapler, FaPowerOff } from "react-icons/fa6";
import { MdHome, MdSearch  } from "react-icons/md";
import { IoLogInOutline } from "react-icons/io5";

import logo from "../assets/logoDark.svg";
import icon from "../assets/360.png";

import ProfilePanel from '../Components/ProfilePanel'
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

import { useAuth } from "../context/AuthContext";

const Navigator = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { currentUser, userData } = useAuth();

  return (
    <>
      <ProfilePanel
        check={isExpanded}
        setCheck={setIsExpanded}
        posX={242}
        posY={30}
        userName={userData?.nickName}
        userID={userData?.friendshipID}
        memberDate={userData?.createdDate}
      />
      <div
        className={`fixed flex flex-col top-0 left-0 h-screen gap-0 z-1
              w-16 transition-all duration-145 ease-linear justify-between shadow-xl
              bg-[var(--primary-bg)]`}
      >
        <div className="flex flex-col h-64">
          <div
            className={`transition-all duration-400 ease-in-out
                      ${isExpanded 
                        ? 'opacity-0 -translate-y-15' 
                        : 'opacity-100 translate-y-0'}`}
          >
            <SideBarImg
              src={icon}
              toggleExpand={() => setIsExpanded(!isExpanded)}
            />
          </div>
          <div
            className={`transition-all duration-300 ease-in-out delay-75
                      ${isExpanded ? '-translate-y-15' : 'translate-y-0'}`}
          >
            <SideBarHome />
          </div>
          <div
            className={`transition-all duration-300 ease-in-out delay-150
                      ${isExpanded ? '-translate-y-15' : 'translate-y-0'}`}
          >
            <SideBarFriend />
          </div>
          <div
            className={`transition-all duration-300 ease-in-out delay-225
                      ${isExpanded ? '-translate-y-15' : 'translate-y-0'}`}
          >
            <SideBarSearch />
          </div>
        </div>
        <div
          className={`flex flex-col h-16 transition-all duration-300 ease-in-out delay-300
                     ${isExpanded ? '-translate-y-0' : 'translate-y-0'}`}
        >
          <SideBarIconSettings />
        </div>
      </div>
    </>
  );
};

const SideBarPowerOff = () => {
  const navigate = useNavigate();
  return (
    <>
      <div
        className={
          window.location.pathname === "#"
            ? `hovered-icon group mx-2`
            : `icon group hover:scale-105 mx-2`
        }
        onClick={() => navigate("#")}
      >
        <FaPowerOff size="20" />
        <span className="sidebar-tooltip group-hover:scale-100">Kapat</span>
      </div>
    </>
  );
};

const SideBarLogOut = () => {
  const navigate = useNavigate();
  return (
    <>
      <div
        className={
          window.location.pathname === "#"
            ? `hovered-icon group mx-2`
            : `icon group hover:scale-105 mx-2`
        }
        onClick={() => navigate("#")}
      >
        <IoLogInOutline size="30" />
      </div>
    </>
  );
};

const SideBarImg = ({ src, toggleExpand }) => {
  return (
    <>
      <div
        className="icon group cursor-pointer hover:scale-105 rounded-full"
        onClick={toggleExpand}
      >
        <img src={src} className="w-10 h-10 rounded-full" alt={"logo"} />
        <span className="sidebar-tooltip group-hover:scale-100">Profil</span>
      </div>
    </>
  );
};

const SideBarHome = () => {
  const navigate = useNavigate();
  return (
    <>
      <div
        className={
          window.location.pathname === "/"
            ? `hovered-icon group`
            : `icon group hover:scale-105`
        }
        onClick={() => navigate("/")}
      >
        <MdHome size="25" />
        <span className="sidebar-tooltip group-hover:scale-100">Ana Sayfa</span>
      </div>
    </>
  );
};

const SideBarFriend = () => {
  const navigate = useNavigate();
  return (
    <>
      <div
        className={
          window.location.pathname === "/ArkadasEkle"
            ? `hovered-icon group`
            : `icon group hover:scale-105`
        }
        onClick={() => navigate("/ArkadasEkle")}
      >
        <FaStapler size="20" />
        <span className="sidebar-tooltip group-hover:scale-100">
          {"Arkadaş Ekle"}
        </span>
      </div>
    </>
  );
};

const SideBarSearch = () => {
  const navigate = useNavigate();
  return (
    <>
      <div
        className={
          window.location.pathname === "/Test"
            ? `hovered-icon group`
            : `icon group hover:scale-105`
        }
        onClick={() => navigate("/Test")}
      >
        <MdSearch  size="25" />
        <span className="sidebar-tooltip group-hover:scale-100">Sunucu Ara</span>
      </div>
      <hr className="border-[var(--primary-border)] border" />
    </>
  );
};

const SideBarIconSettings = () => {
  const navigate = useNavigate();
  return (
    <>
      <hr className="border-[var(--primary-border)] border" />
      <div
        className={
          window.location.pathname === "/Ayarlar"
            ? `hovered-icon group`
            : `icon group hover:scale-105`
        }
        onClick={() => navigate("/Ayarlar")}
      >
        <BsGearFill size="22" />
        <span className="sidebar-tooltip group-hover:scale-100">Ayarlar</span>
      </div>
    </>
  );
};

export default Navigator;