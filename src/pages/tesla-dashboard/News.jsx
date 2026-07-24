import { useState, useEffect } from "react";
import axios from "axios";
import "./News.css";

const NewsWidget = () => {
  const [headlines, setHeadlines] = useState([]);

  useEffect(() => {
    const fetchHeadlines = async () => {
      try {
        // Using Reddit public subreddits - completely free, CORS friendly
        const allArticles = [];

        const subreddits = ["worldnews", "news", "politics", "sports"];

        const articlePromises = subreddits.map((subreddit) =>
          axios
            .get(`https://www.reddit.com/r/${subreddit}/new.json`, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
              },
            })
            .catch(() => ({ data: { data: { children: [] } } })),
        );

        const responses = await Promise.all(articlePromises);

        responses.forEach((response) => {
          const posts = response.data.data?.children || [];
          posts.forEach((post) => {
            const data = post.data;
            if (data.title) {
              // Try to get image from preview data first
              let imageUrl = "https://dummyimage.com/300x200/cccccc/000000&text=No+Image";

              if (data.preview?.images?.[0]?.source?.url) {
                // Decode URL entities
                imageUrl = data.preview.images[0].source.url.replace(/&amp;/g, "&");
              } else if (data.thumbnail && data.thumbnail !== "self" && data.thumbnail !== "default") {
                imageUrl = data.thumbnail;
              }

              allArticles.push({
                title: data.title,
                link: `https://reddit.com${data.permalink}`,
                image_url: imageUrl,
              });
            }
          });
        });

        // Limit to 12 articles total
        setHeadlines(allArticles.slice(0, 12));
        console.log("🚀 ~ fetchHeadlines ~ articles:", allArticles.slice(0, 12));
      } catch (error) {
        console.error("Error fetching the news headlines", error);
      }
    };

    fetchHeadlines();
  }, []);

  return (
    <div
      className="news-widget"
      style={{
        display: "grid", // Change layout to grid
        width: "48%",
        overflowX: "auto",
        overflowY: "hidden",
        justifyContent: "space-between",
        height: 650, // Match the height of the OddsScreen
        flexWrap: "wrap", // Allow items to wrap to the next line if needed
        columnGap: "10px", // Add spacing between columns
        gridTemplateColumns: "repeat(4, 1fr)", // Set 3 equal columns
        gap: "10px", // Add spacing between items
        backgroundColor: "#003015", // Updated background color to Baylor green
      }}>
      {headlines.map((article, index) => (
        <a
          key={index}
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", color: "inherit" }}>
          <div
            key={index}
            className="news-item"
            style={{ width: 100, margin: 10, display: "flex", flexDirection: "column" }}>
            <img
              src={article.image_url || "https://dummyimage.com/300x200/cccccc/000000&text=No+Image"}
              alt={"img"}
              className="news-image"
            />
            <p className="news-title" style={{ lineHeight: 1.1, width: 120, margin: 0, marginTop: 5, fontSize: 14 }}>
              {article.title.split(" - ")[0]} {/* Show only the part of the title before the source */}
            </p>{" "}
            <p className="news-title" style={{ lineHeight: 1.1, width: 120, margin: 2, marginTop: 5, fontSize: 14 }}>
              {article.title.split(" - ")[1]} {/* Show only the part of the title before the source */}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
};

export default NewsWidget;
