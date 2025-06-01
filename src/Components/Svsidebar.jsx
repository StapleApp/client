import { useState } from "react";
import profileBackground2_small from "../assets/profileBackground2_small.png";

const Sidebar = ({ setActiveChannel }) => {
  const [channels, setChannels] = useState([
    { id: 1, name: "Voice Channel #1", type: "voice" },
    { id: 2, name: "Text Channel #1", type: "text" },
  ]);
  const [activeChannel, setActiveStateChannel] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [channelOptions, setChannelOptions] = useState(null);
  const [editingChannel, setEditingChannel] = useState(null);
  const [newChannelName, setNewChannelName] = useState("");

  // Kanal ekleme fonksiyonu
  const addChannel = (type) => {
    const channelCount = channels.filter((channel) => channel.type === type).length + 1;
    const defaultName = type === "voice" ? `Voice Channel #${channelCount}` : `Text Channel #${channelCount}`;
    const newChannel = { id: Date.now(), name: defaultName, type };
    setChannels([...channels, newChannel]);
    setShowDropdown(false);
  };

  // Kanal seçme fonksiyonu
  const handleChannelClick = (channel) => {
    setActiveChannel(channel); // Kanal tıklandığında aktif kanal olarak set edilir
    setActiveStateChannel(channel); // Aktif kanal durumunu da güncelleriz
  };

  // Kanal ismini değiştirme
  const renameChannel = (id) => {
    setChannels(
      channels.map((channel) =>
        channel.id === id ? { ...channel, name: newChannelName || channel.name } : channel
      )
    );
    setEditingChannel(null);
  };

  // Kanal silme
  const deleteChannel = (id) => {
    // Aktif kanal siliniyorsa, aktif kanalı sıfırlıyoruz
    if (activeChannel && activeChannel.id === id) {
      setActiveChannel(null);
    }
    setChannels(channels.filter((channel) => channel.id !== id));
    setChannelOptions(null); // Silme sonrası açılan paneli kapatıyoruz
  };

  // Kanalları türlerine göre ayırmak
  const textChannels = channels.filter((channel) => channel.type === "text");
  const voiceChannels = channels.filter((channel) => channel.type === "voice");

  return (
    <div className="relative h-screen">
      <div className="fixed left-0 top-0 h-screen w-64 bg-[#222831] text-white shadow-lg flex flex-col justify-between">
        <div>
          {/* Sunucu Banner ve Adı */}
          <div
            className="relative bg-cover bg-center h-32 w-full"
            style={{ backgroundImage: `url(${profileBackground2_small})` }} // Arka plan görseli
          >
            <div className="absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center">
              <h1 className="text-white font-bold text-xl">Demo Server</h1>
            </div>
          </div>

          {/* Kanal ekleme butonu */}
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full bg-[#222831] text-white border-2 border-[#393E46] p-2 text-sm"
          >
            + Add Channel
          </button>

          {showDropdown && (
            <div className="bg-[#222831] text-white p-2">
              <button
                onClick={() => addChannel("voice")}
                className="w-full text-left p-1 text-sm hover:bg-[#393E46]"
              >
                Voice Channel
              </button>
              <button
                onClick={() => addChannel("text")}
                className="w-full text-left p-1 text-sm hover:bg-[#393E46]"
              >
                Text Channel
              </button>
            </div>
          )}

          <h2 className="text-md font-bold p-2">Channels</h2>

          {/* Yazı Kanalları */}
          <h3 className="text-sm font-semibold p-2 text-[#FFD369]"># Text Channels</h3>

          <div className="border-t border-[#393E46] mb-2"></div> {/* İnce çizgi */}
          <ul className="flex flex-col">
            {textChannels.map((channel) => (
              <li
                key={channel.id}
                className={`relative w-full p-1 text-sm cursor-pointer flex justify-between items-center ${
                  channel === activeChannel ? "bg-[#393E46] text-[#FFD369]" : "bg-transparent text-white"
                } transition-all duration-200`}
                onClick={() => handleChannelClick(channel)} // Kanal tıklandığında aktif kanal olarak set edilir
              >
                {/* Kanal İsmi */}
                {editingChannel === channel.id ? (
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    onBlur={() => renameChannel(channel.id)}
                    onKeyDown={(e) => e.key === "Enter" && renameChannel(channel.id)}
                    className="bg-transparent border-b border-[#FFD369] outline-none text-white"
                    autoFocus
                  />
                ) : (
                  <span>{channel.name}</span>
                )}

                {/* Üç Nokta Menüsü */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setChannelOptions(channelOptions === channel.id ? null : channel.id);
                  }}
                  className="text-white px-1 py-0.5 text-xs"
                >
                  ...
                </button>

                {/* Kanal Ayarları Dropdown */}
                {channelOptions === channel.id && (
                  <div className="absolute right-0 top-full mt-1 bg-[#222831] text-white text-sm border border-[#393E46] p-1 shadow-lg z-10">
                    <button
                      onClick={() => {
                        setEditingChannel(channel.id);
                        setNewChannelName(channel.name);
                        setChannelOptions(null);
                      }}
                      className="block w-full text-left p-1 hover:bg-[#393E46]"
                    >
                      Rename Channel
                    </button>
                    <button
                      onClick={() => deleteChannel(channel.id)}
                      className="block w-full text-left p-1 hover:bg-[#393E46] text-red-400"
                    >
                      Delete Channel
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="border-t border-[#393E46] mt-2 mb-2"></div> {/* İnce çizgi */}

          {/* Ses Kanalları */}
          <h3 className="text-sm font-semibold p-2 text-[#FFD369]">🔊 Voice Channels</h3>
          <div className="border-t border-[#393E46] mb-2"></div> {/* İnce çizgi */}
          <ul className="flex flex-col">
            {voiceChannels.map((channel) => (
              <li
                key={channel.id}
                className={`relative w-full p-1 text-sm cursor-pointer flex justify-between items-center ${
                  channel === activeChannel ? "bg-[#393E46] text-[#FFD369]" : "bg-transparent text-white"
                } transition-all duration-200`}
                onClick={() => handleChannelClick(channel)} // Kanal tıklandığında aktif kanal olarak set edilir
              >
                {/* Kanal İsmi */}
                {editingChannel === channel.id ? (
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    onBlur={() => renameChannel(channel.id)}
                    onKeyDown={(e) => e.key === "Enter" && renameChannel(channel.id)}
                    className="bg-transparent border-b border-[#FFD369] outline-none text-white"
                    autoFocus
                  />
                ) : (
                  <span>{channel.name}</span>
                )}

                {/* Üç Nokta Menüsü */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setChannelOptions(channelOptions === channel.id ? null : channel.id);
                  }}
                  className="text-white px-1 py-0.5 text-xs"
                >
                  ...
                </button>

                {/* Kanal Ayarları Dropdown */}
                {channelOptions === channel.id && (
                  <div className="absolute right-0 top-full mt-1 bg-[#222831] text-white text-sm border border-[#393E46] p-1 shadow-lg z-10">
                    <button
                      onClick={() => {
                        setEditingChannel(channel.id);
                        setNewChannelName(channel.name);
                        setChannelOptions(null);
                      }}
                      className="block w-full text-left p-1 hover:bg-[#393E46]"
                    >
                      Rename Channel
                    </button>
                    <button
                      onClick={() => deleteChannel(channel.id)}
                      className="block w-full text-left p-1 hover:bg-[#393E46] text-red-400"
                    >
                      Delete Channel
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Ses, Mikrofon ve Video Butonları */}
        {activeChannel && activeChannel.type === "voice" && (
          <div className="flex justify-around items-center p-2 border-t border-[#393E46]">
            <button className="p-2 border-2 border-[#393E46] rounded">🔊</button>
            <button className="p-2 border-2 border-[#393E46] rounded">🎤</button>
            <button className="p-2 border-2 border-[#393E46] rounded">🎥</button>
            <button className="p-2 border-2 border-[#393E46] rounded">🖥️</button> {/* Ekran paylaşma butonu */}
          </div>
        )}
      </div>

      {/* Sağdaki Panel */}
      {activeChannel && (
        <div
          className="fixed right-0 top-0 h-screen w-full bg-[#393E46] text-white z-50 p-4"
          style={{ width: "calc(100vw - 256px)" }} // Sidebar'ın genişliği çıkarılarak tam ekran kaplanacak
        >
          <h2 className="text-2xl font-bold">{activeChannel.name}</h2>
          <p>Type: {activeChannel.type}</p>
          <p>Content of the channel will go here...</p>
          {/* Buraya kanala özel içerik ekleyebilirsiniz */}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
