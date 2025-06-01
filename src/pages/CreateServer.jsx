import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { saveServerToFirestore } from "../../firebase";




const CreateServer = () => {
    
    const [serverName, setServerName] = useState("");


    const navigate = useNavigate(); // Sayfa yönlendirmeleri için hook

    try {
        const handleSubmit = async (e) => {
            e.preventDefault(); // Sayfanın yenilenmesini engeller

            // Sunucu adı boş bırakılmışsa uyarı ver
            if (serverName === "") {
                toast.error("Server name cannot be blank");
                return;
            }

            // Sunucu adını Firestore'a kaydet
            await saveServerToFirestore(serverName);
            toast.success("Server created successfully!");
            navigate('/home'); // Kullanıcı ana sayfaya yönlendirilir
        };
    }
    catch (error) {
        console.error("Error creating server:", error);
        toast.error("Failed to create server. Please try again.");
    }

    return (
    <div className="flex items-center justify-center min-h-screen">
        <div className="flex min-h-full w-96 flex-col justify-center px-10 py-12 lg:px-12 bg-white border border-gray-300 rounded-2xl shadow-lg">
            <h3 className="mb-4 text-center text-2xl font-bold tracking-tight text-gray-900">
                Sunucu Oluştur
            </h3>
            <form onSubmit={(e) => {
                e.preventDefault();
                if (serverName === "") {
                    toast.error("Server name cannot be blank");
                    return;
                }
                navigate('/home');
            }}>
                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900">Sunucu Adı</label>
                    <input
                        type="text"
                        value={serverName}
                        onChange={(e) => setServerName(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                    />
                </div>
                <button type="submit" className="mt-4 w-full bg-blue-500 text-white py-2 rounded-md">Oluştur</button>
            </form>
        </div>
      </div>
    );
}

export default CreateServer;

/*
export default function CreateServer() {
  const [serverName, setServerName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Here you would send the server data to your backend or Firestore
    console.log("Creating server:", { serverName, description });

    // Clear form
    setServerName("");
    setDescription("");
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[var(--secondary-bg)] text-[var(--primary-text)]">
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--primary-bg)] p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4"
      >
        <h2 className="text-xl font-bold text-center">Sunucu Oluştur</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Sunucu Adı</label>
          <input
            type="text"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            className="w-full p-2 rounded-md bg-[var(--secondary-bg)] border border-[var(--primary-border)] outline-none focus:border-[var(--accent-color)]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Açıklama</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full p-2 rounded-md bg-[var(--secondary-bg)] border border-[var(--primary-border)] outline-none focus:border-[var(--accent-color)]"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 px-4 rounded-md bg-[var(--accent-color)] text-white font-semibold hover:opacity-90 transition"
        >
          Oluştur
        </button>
      </form>
    </div>
  );
}
*/