import { useState } from 'react';
import { BsFillLightningFill, BsGearFill } from 'react-icons/bs';
import { FaFire, FaStapler, FaPowerOff } from 'react-icons/fa6';
import { CgProfile } from "react-icons/cg";
import { MdOutlineKeyboardArrowRight, MdOutlineKeyboardArrowLeft} from "react-icons/md";
import { IoLogInOutline } from "react-icons/io5";
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logoDark.svg';
import icon from '../assets/360.png';
import profileBackground from '../assets/profileBackground.png'
import profileBackground2_small from '../assets/profileBackground2_small.png'
import '../App.css';

const Navigator = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <>
            <div className={`fixed top-0 left-0 z-1 h-76 w-64 ml-1 rounded-md
                bg-[var(--primary-bg)] shadow-xl
                transition-all duration-150 ease-linear
                flex flex-col justify-between
                ${isExpanded ? 'left-16' : 'opacity-0 pointer-events-none'}`}>

                {/* Üst Menü Öğeleri */}                    
                <div className="flex flex-col h-auto">
                    <div className="grid grid-rows-3">
                        {/* Üst Arkaplan */}
                        <img className="row-span rounded-t-md" src={profileBackground} />   
                        <img className="row-span rounded-b-md" src={profileBackground} />

                        {/* Ortada Duracak İkon */}
                        <div className="absolute top-1/12 grid grid-cols-3 w-64">
                            <div className="icon group cursor-pointer hover:scale-105 w-15 h-15 my-auto ml-3 mr-2 rounded-md">
                                <img src={icon} className='rounded-md w-14 h-14' alt={"logo"} />
                            </div>
                            <div className="grid col-span-2 expanded-text bg-[var(--primary-bg)] h-6 my-auto rounded-md mr-3 p-0">
                                <div className="flex text-sm justify-between">
                                    <span className="ml-2">Chiramii</span>
                                    <span className="mr-2">#777777</span>
                                </div> 
                            </div>
                        </div>

                        {/* Alt Arkaplan */}
                        <div className="grid grid-cols-3 my-auto">
                            <ProfileButton />
                            <ProfileButton />
                            <ProfileButton />
                        </div>
                        
                    </div>
                    <textarea className="expanded-text text-sm bg-[var(--secondary-bg)]
                    col-span-2 m-1 pl-2 rounded-md h-14 p-0 resize-none"
                        type="text"
                        // value={""}
                        maxLength="100"
                        placeholder="Hakkında...">
                    </textarea>
                </div>

                {/* Alt Menü Öğeleri */}
                <div className="flex flex-col h-16">
                    <hr className="border-[var(--primary-border)] border" />
                    <div className="expanded-text h-6 rounded-md mr-3 p-0 flex my-auto">
                        <span className="ml-2 text-sm expanded-text h-12">Şu tarihten beri üye: 21/03/2025</span>
                    </div>
                </div>
            </div> 

            <div className={`fixed flex flex-col top-0 left-0 h-screen gap-0 z-1
            w-16 transition-all duration-145 ease-linear justify-between shadow-xl
            bg-[var(--primary-bg)]`}>
                <div className="flex flex-col h-64">
                    {isExpanded ? null : <SideBarImg src={icon} toggleExpand={() => setIsExpanded(!isExpanded)} /> }
                    <SideBarHome />
                    <SideBarFriend />
                    <SideBarTest />
                </div>
                <div className="flex flex-col h-32">                  
                    <SideBarIconExpand
                        icon={isExpanded ? <MdOutlineKeyboardArrowLeft size="35" /> : <MdOutlineKeyboardArrowRight size="35" />}  
                        toggleExpand={() => setIsExpanded(!isExpanded)} 
                    />
                    <SideBarIconSettings />
                </div>
            </div>
        </>
    );
};

const ProfileButton = () => {
    const navigate = useNavigate();
    return (
        <>  
            <div className="flex icon group cursor-pointer hover:scale-105 h-7 w-20 mt-1 mb-0 mx-auto" onClick={() => navigate("/Profile")}>
                <span className="bg-[var(--primary-bg)]
                text-[var(--primary-text)] text-sm font-bold mr-1">
                    Profil
                </span>
                <CgProfile />
            </div>
        </>
    );
};

const SideBarPowerOff = () => {
    const navigate = useNavigate();
    return (
        <>
            <div className={window.location.pathname === "#" ? `hovered-icon group mx-2` : `icon group hover:scale-105 mx-2`}
                onClick={() => navigate("#")}>
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
            <div className={window.location.pathname === "#" ? `hovered-icon group mx-2` : `icon group hover:scale-105 mx-2`}
                onClick={() => navigate("#")}>
                <IoLogInOutline size="30" />    
                <span className="sidebar-tooltip group-hover:scale-100">Çıkış Yap</span>
            </div>
        </>
    );
};

const SideBarImg = ({src, toggleExpand}) => {
    const navigate = useNavigate();
    return (
        <>  
            <div className="icon group cursor-pointer hover:scale-105" onClick={toggleExpand}>
                <img src={src} className="w-10 h-10 rounded-md" alt={"logo"} />
                <span className="sidebar-tooltip group-hover:scale-100">Profil</span>
            </div>
        </>
    );
};

const SideBarHome = () => {
    const navigate = useNavigate();
    return (
        <>
            <div className={window.location.pathname === "/" ? `hovered-icon group` : `icon group hover:scale-105`}
                onClick={() => navigate("/")}>
                <FaFire size="20" />    
                <span className="sidebar-tooltip group-hover:scale-100">Ana Sayfa</span>
            </div>
        </>
    );
};

const SideBarFriend = () => {
    const navigate = useNavigate();
    return (
        <>
            <div className={window.location.pathname === "/ArkadasEkle" ? `hovered-icon group` : `icon group hover:scale-105`}
                onClick={() => navigate("/ArkadasEkle")}>
                <FaStapler size="20" />
                <span className="sidebar-tooltip group-hover:scale-100">{"Arkadaş Ekle"}</span>
            </div>
        </>
    );
};

const SideBarTest = () => {
    const navigate = useNavigate();
    return (
        <>
            <div className={window.location.pathname === "/Test" ? `hovered-icon group` : `icon group hover:scale-105`}
                onClick={() => navigate("/Test")}>
                <BsFillLightningFill size="20" />
                <span className="sidebar-tooltip group-hover:scale-100">Test</span>
            </div>
            <hr className="border-[var(--primary-border)] border" />
        </>
    );
};

const SideBarIconExpand = ({ icon, toggleExpand }) => {
    return (
        <>
            <hr className="border-[var(--primary-border)] border" />
            <div className="icon group cursor-pointer hover:scale-105" onClick={toggleExpand}>
                {icon}
                <span className="sidebar-tooltip group-hover:scale-100">Genişlet</span>
            </div>
        </>
    );
};

const SideBarIconSettings = () => {
    const navigate = useNavigate();
    return (
        <>
            <div className={window.location.pathname === "/Ayarlar" ? `hovered-icon group` : `icon group hover:scale-105`}
                onClick={() => navigate("/Ayarlar")}>
                <BsGearFill size="22" />
                <span className="sidebar-tooltip group-hover:scale-100">Ayarlar</span>
            </div>
        </>
    );
};

export default Navigator;
