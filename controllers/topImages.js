const SliderImages = require("../models/sliderImages");
const Category = require("../models/category");
const fs = require("fs");

const dateHelper = require("../helpers/date_formator");
const convertOverview = require('../helpers/html_decode');


// To display images page
const topImages = async (req, res) => {
    try {
        let allTopImages = await getAllSliderImages();

        allTopImages = await Promise.all(
            allTopImages.map(async (topImage) => {
                const categoryId = topImage.category;

                // Convert the overview
                const newDescription = await convertOverview(topImage.description);

                const categories = await Promise.all(
                    categoryId.map(async (id) => {
                        const parsedCategoryId = parseInt(id.replace(/"/g, ''));

                        // Fetch the category based on the parsed ID
                        const category = await Category.findOne({ where: { id: parsedCategoryId } });
                        // console.log(category.name);
                        // return category ? JSON.stringify(category.dataValues.name, null, 2) : 'No';
                        return category.name;
                    })
                );

                return {
                    ...topImage.dataValues,
                    formattedDate: dateHelper.formatDate(topImage.release_date),
                    newDescription: newDescription,
                    categories,
                };
            })
        );

        res.render("topImages/topImages", {
            title: "Top Images",
            allTopImages,
        });
    } catch (error) {
        console.error("Error processing top images:", error);
        res.status(500).send("Internal Server Error");
    }
};




// To render page according to add or edit request
const displayTopImagesPage = async (req, res) => {
    try {
        const id = req.params.id;

        if (id) {
            const topImage = await SliderImages.findOne({ where: { id: id } });

            if (topImage) {
                res.render("topImages/add_topImages", {
                    title: "Edit Top Image",
                    topImage: topImage,
                });
            } else {
                res.send("Top Image is not found");
            }
        } else {
            res.render("topImages/add_topImages", {
                title: "Add Top Image",
                topImage: null,
            });
        }

    } catch (error) {
        console.error("Error in displayTopImagesPage:", error);
    }
}
// To add-edit top image
const addOrEditTopImage = async (req, res) => {
    try {
        let {
            id,
            title,
            category,
            description,
            language,
            release_date,
            duration,
            isPlay,
            isMore,
            isImage,
            image_old
        } = req.body;

        // Use the uploaded file if present; otherwise, fallback to the old image
        let image = req.file ? req.file.filename : image_old;

        // if new image is uploaded then old image is deleted
        if (req.file && image_old) {
            try {
                fs.unlinkSync(`assets/img/topImages/${image_old}`);
            } catch (err) {
                console.error("Failed to delete old image:", err);
            }
        }

        // Convert checkbox values to booleans
        isPlay = isPlay === "on";
        isMore = isMore === "on";
        isImage = isImage === "on";

        const categoryIds = Array.isArray(category) ? category.join(",") : category || null;

        if (id) {
            // edit top image
            const isTopImageUpdated = await SliderImages.update({
                title,
                description,
                language,
                category: categoryIds,
                release_date,
                duration,
                isPlay,
                isMoreInfo: isMore,
                isImage,
                image
            }, {
                where: { id: id }
            });

            if (isTopImageUpdated > 0) {
                return res.redirect("/topImages");
            } else {
                return res.status(500).send("Failed to edit top image.");
            }

        } else {
            const isTopImageCreated = await SliderImages.create({
                title,
                description,
                language,
                category: categoryIds,
                release_date,
                duration,
                isPlay,
                isMoreInfo: isMore,
                isImage,
                image
            });

            if (isTopImageCreated) {
                return res.redirect("/topImages");
            } else {
                return res.status(500).send("Failed to create top image.");
            }
        }

    } catch (error) {
        console.error("Error in addOrEditTopImages:", error);
    }
}
// To delete top image
const deleteTopImage = async (req, res) => {
    try {
        const id = req.params.id;
        console.log("ID: ", id);

        const topImage = await SliderImages.findOne({
            attributes: ['image'],
            where: { id },
        });

        if (!topImage) {
            return res.send("Top Image not found.");
        }

        const image = topImage.image;

        await SliderImages.destroy({ where: { id } });

        if (image) {
            const imagePath = `assets/img/topImages/${image}`;
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error("Failed to delete image:", err);
                }
            });
        }
        res.redirect("/topImages");

    } catch (error) {
        console.error("Error in deleteTopImage:", error);
    }
}


// Top Images API
const topImagesAPI = async (req, res) => {
    try {
        let topImages = await getAllSliderImages();
        const baseURL = `${process.env.URL}${process.env.PORT}`;

        if (!topImages) {
            res.json({
                status: false,
                message: "No data found",
            });
        }

        topImages = await Promise.all(
            topImages = topImages.map(async (top) => {
                let categoryId = top.category;
                // Convert the overview
                const newDescription = await convertOverview(top.description);

                const categories = await Promise.all(
                    categoryId.map(async (id) => {
                        const parsedCategoryId = parseInt(id.replace(/"/g, ''));

                        // Fetch the category based on the parsed ID
                        const category = await Category.findOne({ where: { id: parsedCategoryId } });
                        return category.name;
                    })
                );

                return {
                    title: top.title,
                    description: newDescription,
                    category: categories,
                    language: top.language,
                    release_date: dateHelper.formatDate(top.release_date),
                    duration: top.duration,
                    isPlay: top.isPlay,
                    isMoreInfo: top.isMoreInfo,
                    isImage: top.isImage,
                    image: `${baseURL}/img/topImages/${top.image}`
                }
            })
        )

        res.json({
            status: true,
            data: topImages,
        });

    } catch (error) {
        res.json({
            status: false,
            message: "Error in Top Images API",
        });
    }
}


// Get all data
const getAllSliderImages = async () => {
    return await SliderImages.findAll({
        order: [['id', "DESC"]]
    });
}



module.exports = {
    topImages,

    displayTopImagesPage,
    addOrEditTopImage,
    deleteTopImage,

    topImagesAPI,
}


