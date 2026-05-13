create table currency_exchange (
                                   id bigint primary key,
                                   currency_from varchar(255) not null,
                                   currency_to varchar(255) not null,
                                   conversion_multiple numeric(38, 2) not null,
                                   environment varchar(255)
);