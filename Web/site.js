const serverUrl = "https://localhost:7027";
const ONE_MB = 1024 * 1024;

let downloadFileName;
let uploadedFileName;

const progressBar = document.getElementById("progressBar");
const btnUpload = document.getElementById("btnUpload");
const btnDownload = document.getElementById("btnDownload");
const fileInput = document.getElementById("fileInput");

const uploadFileInChunks = async (file, uploadUrl, chunkSize = ONE_MB) => {
  try {
    let uploadId;
    const totalChunks = Math.ceil(file.size / chunkSize);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      // Calculate chunk start and end
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);

      // Slice the file
      const chunk = file.slice(start, end);

      // Prepare the form data
      const formData = new FormData();
      formData.append("fileChunk", chunk);
      formData.append("chunkIndex", chunkIndex);
      formData.append("totalChunks", totalChunks);
      formData.append("fileName", file.name);
      formData.append("uploadId", uploadId ?? "");

      // Upload the chunk
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to upload chunk ${chunkIndex + 1}/${totalChunks}`
        );
      }

      var responseText = await response.text();
      if (!uploadId) {
        uploadId = responseText;
      }

      if (chunkIndex + 1 == totalChunks) {
        downloadFileName = responseText;
      }

      // Update progress
      const progressPercentage = Math.round(
        ((chunkIndex + 1).toFixed(2) / totalChunks.toFixed(2)) * 100
      );
      progressBar.style.width = `${progressPercentage}%`;
      progressBar.innerText = progressBar.style.width;

      console.log(`Uploaded chunk ${chunkIndex + 1} of ${totalChunks}`);
    }

    progressBar.style.width = `100%`;
    progressBar.innerText = progressBar.style.width;

    // Enable download
    btnDownload.disabled = false;
    fileInput.disabled = false;

    // Reset upload
    uploadId = undefined;

    console.log("File uploaded successfully!");
  } catch (error) {
    console.log("Error uploading file:", error);
  }
};

btnUpload.addEventListener("click", (event) => {
  if (fileInput.files.length == 0) return;

  fileInput.disabled = true;
  btnUpload.disabled = true;

  const file = fileInput.files[0];
  const uploadUrl = `${serverUrl}/api/upload`;

  uploadedFileName = file.name;
  uploadFileInChunks(file, uploadUrl);
});

fileInput.addEventListener("change", (event) => {
  // Reset controls
  progressBar.style.width = `0%`;
  progressBar.innerText = progressBar.style.width;

  downloadFileName = undefined;
  uploadedFileName = undefined;
  
  btnDownload.disabled = true;
  btnUpload.disabled = false;
});

const downloadFile = async (fileName, downloadUrl) => {
  try {
    const response = await fetch(`${downloadUrl}/${fileName}`);

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    // Read the response as a blob
    const blob = await response.blob();

    // Create a URL for the blob
    const url = window.URL.createObjectURL(blob);

    // Create an anchor element and trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = uploadedFileName; // Set the file name
    document.body.appendChild(a);
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log("File downloaded successfully!");
  } catch (error) {
    console.log("Error downloading file:", error);
  }
};

btnDownload.addEventListener("click", () => {
  const fileName = downloadFileName;

  const downloadUrl = `${serverUrl}/api/upload/download`;
  downloadFile(fileName, downloadUrl);
});
