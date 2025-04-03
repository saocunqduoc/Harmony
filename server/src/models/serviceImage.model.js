module.exports = (sequelize, DataTypes) => {
  const ServiceImage = sequelize.define(
    "ServiceImage",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "services",
          key: "id",
        },
      },
      image_url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
    },
    {
      tableName: "service_images",
      timestamps: false,
    },
  )

  return ServiceImage
}

