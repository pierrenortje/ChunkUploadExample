using Microsoft.AspNetCore.Mvc;

namespace ChunkUploadExample.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UploadController : ControllerBase
    {
        [HttpPost]
        public async Task<IActionResult> UploadChunk([FromForm] UploadBody request)
        {
            if (request.FileChunk == null || request.FileChunk.Length == 0)
            {
                return BadRequest("File chunk is missing.");
            }

            Guid uploadId;
            if (string.IsNullOrEmpty(request.UploadId))
                uploadId = Guid.NewGuid();
            else
                uploadId = Guid.Parse(request.UploadId);

            // Define a temporary storage location
            var tempFolder = Path.Combine(Path.GetTempPath(), "uploads", uploadId.ToString());
            Directory.CreateDirectory(tempFolder);

            // Save the chunk
            var chunkPath = Path.Combine(tempFolder, $"chunk_{request.ChunkIndex}");
            using (var stream = new FileStream(chunkPath, FileMode.Create))
            {
                await request.FileChunk.CopyToAsync(stream);
            }

            // Check if all chunks are uploaded
            if (Directory.GetFiles(tempFolder).Length == request.TotalChunks)
            {
                // Combine chunks into the final file
                var ext = Path.GetExtension(request.FileName);
                string fileName = $"{uploadId}{ext}";
                var finalFilePath = Path.Combine(Path.GetTempPath(), fileName);
                using (var finalFileStream = new FileStream(finalFilePath, FileMode.Create))
                {
                    for (int i = 0; i < request.TotalChunks; i++)
                    {
                        var partPath = Path.Combine(tempFolder, $"chunk_{i}");
                        using (var partStream = new FileStream(partPath, FileMode.Open))
                        {
                            await partStream.CopyToAsync(finalFileStream);
                        }
                    }
                }

                // Clean up temporary files
                Directory.Delete(tempFolder, true);

                // File upload successfully
                return Ok(fileName);
            }

            // Uploaded chunk successfully
            return Ok(uploadId.ToString());
        }

        [HttpGet("download/{fileName}")]
        public async Task<IActionResult> DownloadFile(string fileName)
        {
            var filePath = Path.Combine(Path.GetTempPath(), fileName);

            if (!System.IO.File.Exists(filePath))
            {
                return NotFound("File not found.");
            }

            // Open the file stream for reading
            var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);

            // Return the file stream to the client
            return File(fileStream, "application/octet-stream", fileName, enableRangeProcessing: true);
        }
    }

    public class UploadBody
    {
        public string UploadId { get; set; }
        public IFormFile FileChunk { get; set; }
        public int ChunkIndex { get; set; }
        public int TotalChunks { get; set; }
        public string FileName { get; set; }
    }
}