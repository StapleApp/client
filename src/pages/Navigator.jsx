import { useState } from 'react';
import { BsFillLightningFill, BsGearFill } from 'react-icons/bs';
import { FaFire, FaStapler, FaPowerOff } from 'react-icons/fa6';
import { MdOutlineKeyboardArrowRight, MdOutlineKeyboardArrowLeft} from "react-icons/md";
import { IoLogInOutline } from "react-icons/io5";
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logoDark.svg';
import icon from '../assets/360.png';
import profileBackground from '../assets/profileBackground.png'
import '../App.css';

const Navigator = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <>
            <div className={`fixed top-0 left-0 z-1 h-screen
                bg-[var(--primary-bg)] shadow-xl
                transition-all duration-150 ease-linear
                flex flex-col justify-between
                ${isExpanded ? 'left-16' : 'opacity-0 pointer-events-none'}`}>

                <div className="flex flex-col h-48">
                    {/* Üst Menü Öğeleri */}
                    <div className="grid grid-rows-3 h-48">
                        {/* Üst Arkaplan */}
                        <img src={profileBackground} />   

                        {/* Ortada Duracak İkon */}
                        <div className="grid grid-cols-3 w-64">
                            <div className="icon group cursor-pointer hover:scale-105 w-15 h-15 my-auto ml-1 mr-2 rounded-md">
                                <img src={icon} className='rounded-md w-14 h-14' alt={"logo"} />
                            </div>
                            <div className="col-span-2"> 
                                <div className="expanded-text text-lg text-amber-200 justify-end">
                                    Chiramii #777777
                                </div>
                                <div className="expanded-text text-lg justify-end">
                                    Uyuyor...
                                </div>
                            </div>
                        </div>

                        {/* Alt Arkaplan */}
                        <div className="grid grid-cols-3 w-64">
                            <div className="expanded-text flex bg-[var(--secondary-bg)] col-span-3 m-1 rounded-md h-14 p-0">
                                Bunu yazan tosun okuyana kosun :)
                            </div>
                        </div>
                    </div>
                    <hr className="border-[var(--primary-border)] border" />
                </div>

                {/* Alt Menü Öğeleri */}
                <div className="flex flex-col h-32">
                    <hr className="border-[var(--primary-border)] border" />
                    <div className="grid grid-rows-2 h-32">
                        <div className="flex flex-row justify-end items-end row-start-2">
                            <SideBarLogOut />
                            <SideBarPowerOff />  
                        </div>
                    </div>
                </div>
            </div> 

            <div className={`fixed flex flex-col top-0 left-0 h-screen gap-0 z-1
            w-16 transition-all duration-145 ease-linear justify-between shadow-xl
            bg-[var(--primary-bg)]`}>
                <div className="flex flex-col h-64">
                    {isExpanded ? null : <SideBarImg src={icon} /> }
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

const SideBarImg = ({src}) => {
    const navigate = useNavigate();
    return (
        <>  
            <div className="icon group cursor-pointer hover:scale-105" onClick={() => navigate("/")}>
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
